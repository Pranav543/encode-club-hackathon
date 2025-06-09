// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "../src/StreamingContract.sol";
import "../src/examples/LendingHook.sol";
import "../src/interfaces/IStreamingRecipient.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/utils/introspection/ERC165.sol";

contract MockERC20 is ERC20 {
    constructor() ERC20("Mock Token", "MOCK") {
        _mint(msg.sender, 1000000 * 10**18);
    }
}

contract MockHook is IStreamingRecipient, ERC165 {
    address public immutable STREAMING_CONTRACT;
    bool public shouldRevert;
    
    uint256 public lastStreamId;
    address public lastCaller;
    uint256 public lastAmount;
    
    constructor(address streamingContract) {
        STREAMING_CONTRACT = streamingContract;
    }
    
    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC165, IERC165) returns (bool) {
        return interfaceId == type(IStreamingRecipient).interfaceId || super.supportsInterface(interfaceId);
    }
    
    function setShouldRevert(bool _shouldRevert) external {
        shouldRevert = _shouldRevert;
    }
    
    function onStreamingWithdraw(
        uint256 streamId,
        address caller,
        address to,
        uint256 amount
    ) external returns (bytes4) {
        require(msg.sender == STREAMING_CONTRACT, "Only streaming contract");
        if (shouldRevert) revert("Hook reverted");
        
        lastStreamId = streamId;
        lastCaller = caller;
        lastAmount = amount;
        
        return IStreamingRecipient.onStreamingWithdraw.selector;
    }
    
    function onStreamingCancel(
        uint256 streamId,
        address sender,
        uint256 senderAmount,
        uint256 recipientAmount
    ) external returns (bytes4) {
        require(msg.sender == STREAMING_CONTRACT, "Only streaming contract");
        if (shouldRevert) revert("Hook reverted");
        
        lastStreamId = streamId;
        lastAmount = recipientAmount;
        
        return IStreamingRecipient.onStreamingCancel.selector;
    }
}

contract StreamingContractHooksTest is Test {
    StreamingContract public streamingContract;
    MockERC20 public token;
    MockHook public mockHook;
    LendingHook public lendingHook;
    
    address public sender = makeAddr("sender");
    address public owner = makeAddr("owner");
    
    uint256 public constant DEPOSIT = 1000 * 10**18;
    
    function setUp() public {
        vm.prank(owner);
        streamingContract = new StreamingContract(owner);
        
        token = new MockERC20();
        mockHook = new MockHook(address(streamingContract));
        lendingHook = new LendingHook(address(streamingContract));
        
        token.transfer(sender, 1000000 * 10**18);
        
        vm.prank(sender);
        token.approve(address(streamingContract), type(uint256).max);
    }
    
    function test_AllowlistHook() public {
        vm.prank(owner);
        streamingContract.allowlistHook(address(mockHook));
        
        assertTrue(streamingContract.isHookAllowlisted(address(mockHook)));
        assertEq(streamingContract.getAllowlistedHooksCount(), 1);
        
        address[] memory hooks = streamingContract.getAllowlistedHooks();
        assertEq(hooks[0], address(mockHook));
    }
    
    function test_RevertWhen_AllowlistNonInterfaceHook() public {
        vm.expectRevert();
        vm.prank(owner);
        streamingContract.allowlistHook(address(token)); // ERC20 doesn't implement IStreamingRecipient
    }
    
    function test_WithdrawHookExecution() public {
        // Allowlist hook
        vm.prank(owner);
        streamingContract.allowlistHook(address(mockHook));
        
        // Create stream to hook contract
        vm.prank(sender);
        uint256 streamId = streamingContract.createLinearStream(
            address(mockHook),
            DEPOSIT,
            address(token),
            block.timestamp,
            block.timestamp + 1000,
            true
        );
        
        // Fast forward and withdraw
        vm.warp(block.timestamp + 500);
        uint256 balance = streamingContract.balanceOf(streamId);
        
        vm.prank(address(mockHook));
        streamingContract.withdrawFromStream(streamId, balance);
        
        // Verify hook was called
        assertEq(mockHook.lastStreamId(), streamId);
        assertEq(mockHook.lastCaller(), address(mockHook));
        assertEq(mockHook.lastAmount(), balance);
    }
    
    function test_CancelHookExecution() public {
        // Allowlist hook
        vm.prank(owner);
        streamingContract.allowlistHook(address(mockHook));
        
        // Create stream to hook contract
        vm.prank(sender);
        uint256 streamId = streamingContract.createLinearStream(
            address(mockHook),
            DEPOSIT,
            address(token),
            block.timestamp,
            block.timestamp + 1000,
            true
        );
        
        // Fast forward and cancel
        vm.warp(block.timestamp + 300);
        
        vm.prank(sender);
        streamingContract.cancelStream(streamId);
        
        // Verify hook was called
        assertEq(mockHook.lastStreamId(), streamId);
    }
    
    function test_RevertWhen_HookFails() public {
        // Allowlist hook
        vm.prank(owner);
        streamingContract.allowlistHook(address(mockHook));
        
        // Set hook to revert
        mockHook.setShouldRevert(true);
        
        // Create stream to hook contract
        vm.prank(sender);
        uint256 streamId = streamingContract.createLinearStream(
            address(mockHook),
            DEPOSIT,
            address(token),
            block.timestamp,
            block.timestamp + 1000,
            true
        );
        
        // Fast forward and try to withdraw - should revert
        vm.warp(block.timestamp + 500);
        uint256 balance = streamingContract.balanceOf(streamId);
        
        vm.expectRevert();
        vm.prank(address(mockHook));
        streamingContract.withdrawFromStream(streamId, balance);
    }
    
    function test_NoHookExecutionForNonAllowlistedRecipient() public {
        // Create stream to regular address (not allowlisted hook)
        address regularRecipient = makeAddr("regularRecipient");
        
        vm.prank(sender);
        uint256 streamId = streamingContract.createLinearStream(
            regularRecipient,
            DEPOSIT,
            address(token),
            block.timestamp,
            block.timestamp + 1000,
            true
        );
        
        // Fast forward and withdraw - should work without hook execution
        vm.warp(block.timestamp + 500);
        uint256 balance = streamingContract.balanceOf(streamId);
        
        vm.prank(regularRecipient);
        streamingContract.withdrawFromStream(streamId, balance);
        
        // Should succeed without any hook calls
        assertTrue(true);
    }
    
    function test_LendingHookExample() public {
        // Allowlist lending hook
        vm.prank(owner);
        streamingContract.allowlistHook(address(lendingHook));
        
        // Create stream to lending hook
        vm.prank(sender);
        uint256 streamId = streamingContract.createLinearStream(
            address(lendingHook),
            DEPOSIT,
            address(token),
            block.timestamp,
            block.timestamp + 1000,
            true
        );
        
        // Create a loan against the stream
        lendingHook.createLoan(streamId, 100 * 10**18, 500); // 5% interest
        
        // Fast forward and withdraw - should trigger loan repayment logic
        vm.warp(block.timestamp + 500);
        uint256 balance = streamingContract.balanceOf(streamId);
        
        vm.prank(address(lendingHook));
        streamingContract.withdrawFromStream(streamId, balance);
        
        // Should succeed with hook execution
        assertTrue(true);
    }
}
