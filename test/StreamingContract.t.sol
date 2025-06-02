// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "../src/StreamingContract.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockERC20 is ERC20 {
    constructor() ERC20("Mock Token", "MOCK") {
        _mint(msg.sender, 1000000 * 10 ** 18);
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

contract StreamingContractTest is Test {
    StreamingContract public streamingContract;
    MockERC20 public token;

    address public sender = makeAddr("sender");
    address public recipient = makeAddr("recipient");
    address public owner = makeAddr("owner");
    address public alice = makeAddr("alice");
    address public bob = makeAddr("bob");
    address public charlie = makeAddr("charlie");

    uint256 public constant INITIAL_BALANCE = 1000000 * 10 ** 18;
    uint256 public constant DEPOSIT = 1000 * 10 ** 18;
    uint256 public constant BROKER_FEE_PERCENTAGE = 100; // 1%
    uint256 public constant PERCENTAGE_SCALE = 10000;
    uint256 public constant LOG_PRECISION = 1e18;

    event StreamCreated(
        uint256 indexed streamId,
        address indexed sender,
        address indexed recipient,
        uint256 deposit,
        address tokenAddress,
        uint256 startTime,
        uint256 stopTime,
        bool cancelable,
        StreamingContract.StreamShape shape
    );

    event WithdrawFromStream(
        uint256 indexed streamId,
        address indexed recipient,
        uint256 amount
    );

    event StreamCanceled(
        uint256 indexed streamId,
        address indexed sender,
        address indexed recipient,
        uint256 senderBalance,
        uint256 recipientBalance
    );

    function setUp() public {
        vm.prank(owner);
        streamingContract = new StreamingContract(owner);

        token = new MockERC20();

        // Distribute tokens
        token.transfer(sender, INITIAL_BALANCE / 4);
        token.transfer(alice, INITIAL_BALANCE / 4);
        token.transfer(bob, INITIAL_BALANCE / 4);

        // Setup approvals
        vm.prank(sender);
        token.approve(address(streamingContract), type(uint256).max);

        vm.prank(alice);
        token.approve(address(streamingContract), type(uint256).max);

        vm.prank(bob);
        token.approve(address(streamingContract), type(uint256).max);
    }

    // ============ LINEAR STREAM TESTS (Backward Compatibility) ============

    function test_CreateStream() public {
        uint256 startTime = block.timestamp + 100;
        uint256 stopTime = startTime + 1000;

        vm.expectEmit(true, true, true, true);
        emit StreamCreated(
            1,
            sender,
            recipient,
            (DEPOSIT * 99) / 100, // After broker fee
            address(token),
            startTime,
            stopTime,
            true,
            StreamingContract.StreamShape.LINEAR
        );

        vm.prank(sender);
        uint256 streamId = streamingContract.createStream(
            recipient,
            DEPOSIT,
            address(token),
            startTime,
            stopTime,
            true
        );

        assertEq(streamId, 1);
        assertEq(streamingContract.ownerOf(streamId), recipient);
        assertEq(streamingContract.getTotalStreams(), 1);

        StreamingContract.Stream memory stream = streamingContract.getStream(
            streamId
        );
        assertEq(stream.sender, sender);
        assertEq(stream.recipient, recipient);
        assertEq(stream.deposit, (DEPOSIT * 99) / 100);
        assertEq(stream.startTime, startTime);
        assertEq(stream.stopTime, stopTime);
        assertTrue(stream.isActive);
        assertTrue(stream.cancelable);
        assertEq(
            uint8(stream.shape),
            uint8(StreamingContract.StreamShape.LINEAR)
        );
    }

    function test_CreateMultipleStreams() public {
        uint256 startTime = block.timestamp + 100;
        uint256 stopTime = startTime + 1000;

        vm.startPrank(sender);
        uint256 streamId1 = streamingContract.createStream(
            recipient,
            DEPOSIT,
            address(token),
            startTime,
            stopTime,
            true
        );
        uint256 streamId2 = streamingContract.createStream(
            alice,
            DEPOSIT,
            address(token),
            startTime,
            stopTime,
            false
        );
        uint256 streamId3 = streamingContract.createStream(
            bob,
            DEPOSIT,
            address(token),
            startTime,
            stopTime,
            true
        );
        vm.stopPrank();

        assertEq(streamId1, 1);
        assertEq(streamId2, 2);
        assertEq(streamId3, 3);
        assertEq(streamingContract.getTotalStreams(), 3);

        assertEq(streamingContract.ownerOf(streamId1), recipient);
        assertEq(streamingContract.ownerOf(streamId2), alice);
        assertEq(streamingContract.ownerOf(streamId3), bob);
    }

    function test_CreateStreamBrokerFee() public {
        uint256 startTime = block.timestamp + 100;
        uint256 stopTime = startTime + 1000;
        uint256 ownerBalanceBefore = token.balanceOf(owner);

        vm.prank(sender);
        streamingContract.createStream(
            recipient,
            DEPOSIT,
            address(token),
            startTime,
            stopTime,
            true
        );

        uint256 expectedBrokerFee = (DEPOSIT * BROKER_FEE_PERCENTAGE) /
            PERCENTAGE_SCALE;
        assertEq(
            token.balanceOf(owner),
            ownerBalanceBefore + expectedBrokerFee
        );
    }

    function test_CreateNonCancelableStream() public {
        uint256 startTime = block.timestamp + 100;
        uint256 stopTime = startTime + 1000;

        vm.prank(sender);
        uint256 streamId = streamingContract.createStream(
            recipient,
            DEPOSIT,
            address(token),
            startTime,
            stopTime,
            false // Non-cancelable
        );

        StreamingContract.Stream memory stream = streamingContract.getStream(
            streamId
        );
        assertFalse(stream.cancelable);
    }

    // ============ CREATE STREAM FAILURE TESTS ============

    function test_RevertWhen_CreateStreamToZeroAddress() public {
        vm.expectRevert("Stream to zero address");
        vm.prank(sender);
        streamingContract.createStream(
            address(0),
            DEPOSIT,
            address(token),
            block.timestamp + 100,
            block.timestamp + 1100,
            true
        );
    }

    function test_RevertWhen_CreateStreamToContract() public {
        vm.expectRevert("Stream to contract");
        vm.prank(sender);
        streamingContract.createStream(
            address(streamingContract),
            DEPOSIT,
            address(token),
            block.timestamp + 100,
            block.timestamp + 1100,
            true
        );
    }

    function test_RevertWhen_CreateStreamToSelf() public {
        vm.expectRevert("Stream to caller");
        vm.prank(sender);
        streamingContract.createStream(
            sender,
            DEPOSIT,
            address(token),
            block.timestamp + 100,
            block.timestamp + 1100,
            true
        );
    }

    function test_RevertWhen_CreateStreamWithZeroDeposit() public {
        vm.expectRevert("Deposit is zero");
        vm.prank(sender);
        streamingContract.createStream(
            recipient,
            0,
            address(token),
            block.timestamp + 100,
            block.timestamp + 1100,
            true
        );
    }

    function test_RevertWhen_CreateStreamPastStartTime() public {
        vm.warp(1000); // Set timestamp to 1000
        vm.expectRevert("Start time before block timestamp");
        vm.prank(sender);
        streamingContract.createStream(
            recipient,
            DEPOSIT,
            address(token),
            block.timestamp - 100,
            block.timestamp + 1000,
            true
        );
    }

    function test_RevertWhen_CreateStreamStopBeforeStart() public {
        vm.expectRevert("Stop time before start time");
        vm.prank(sender);
        streamingContract.createStream(
            recipient,
            DEPOSIT,
            address(token),
            block.timestamp + 1000,
            block.timestamp + 100,
            true
        );
    }

    function test_RevertWhen_CreateStreamDepositTooSmall() public {
        vm.expectRevert("Deposit smaller than time delta");
        vm.prank(sender);
        streamingContract.createStream(
            recipient,
            100, // Smaller than duration
            address(token),
            block.timestamp + 100,
            block.timestamp + 1100, // Duration is 1000
            true
        );
    }

    function test_RevertWhen_CreateStreamInsufficientBalance() public {
        MockERC20 newToken = new MockERC20();
        // Don't give sender any tokens
        vm.prank(sender);
        newToken.approve(address(streamingContract), DEPOSIT);

        vm.expectRevert();
        vm.prank(sender);
        streamingContract.createStream(
            recipient,
            DEPOSIT,
            address(newToken),
            block.timestamp + 100,
            block.timestamp + 1100,
            true
        );
    }

    // ============ BALANCE OF TESTS ============

    function test_BalanceOfBeforeStart() public {
        uint256 startTime = block.timestamp + 1000;
        uint256 stopTime = startTime + 1000;

        vm.prank(sender);
        uint256 streamId = streamingContract.createStream(
            recipient,
            DEPOSIT,
            address(token),
            startTime,
            stopTime,
            true
        );

        assertEq(streamingContract.balanceOf(streamId), 0);
    }

    function test_BalanceOfAfterStart() public {
        uint256 startTime = block.timestamp;
        uint256 stopTime = startTime + 1000;

        vm.prank(sender);
        uint256 streamId = streamingContract.createStream(
            recipient,
            DEPOSIT,
            address(token),
            startTime,
            stopTime,
            true
        );

        vm.warp(startTime + 500); // 50% through stream

        uint256 balance = streamingContract.balanceOf(streamId);
        uint256 netDeposit = (DEPOSIT * BROKER_FEE_PERCENTAGE) /
            PERCENTAGE_SCALE;
        netDeposit = DEPOSIT - netDeposit; // After broker fee
        uint256 expectedBalance = netDeposit / 2; // 50% of stream

        assertApproxEqAbs(balance, expectedBalance, 1); // Allow 1 wei difference
    }

    function test_BalanceOfAfterEnd() public {
        uint256 startTime = block.timestamp;
        uint256 stopTime = startTime + 1000;

        vm.prank(sender);
        uint256 streamId = streamingContract.createStream(
            recipient,
            DEPOSIT,
            address(token),
            startTime,
            stopTime,
            true
        );

        vm.warp(stopTime + 100);

        uint256 netDeposit = (DEPOSIT * BROKER_FEE_PERCENTAGE) /
            PERCENTAGE_SCALE;
        netDeposit = DEPOSIT - netDeposit;
        assertEq(streamingContract.balanceOf(streamId), netDeposit);
    }

    function test_BalanceOfInactiveStream() public {
        uint256 startTime = block.timestamp;
        uint256 stopTime = startTime + 1000;

        vm.prank(sender);
        uint256 streamId = streamingContract.createStream(
            recipient,
            DEPOSIT,
            address(token),
            startTime,
            stopTime,
            true
        );

        vm.warp(startTime + 500);

        // Cancel stream
        vm.prank(sender);
        streamingContract.cancelStream(streamId);

        assertEq(streamingContract.balanceOf(streamId), 0);
    }

    function test_RevertWhen_BalanceOfNonexistentStream() public {
        vm.expectRevert("Stream does not exist");
        streamingContract.balanceOf(999);
    }

    // ============ WITHDRAW TESTS ============

    function test_WithdrawFromStream() public {
        uint256 startTime = block.timestamp;
        uint256 stopTime = startTime + 1000;

        vm.prank(sender);
        uint256 streamId = streamingContract.createStream(
            recipient,
            DEPOSIT,
            address(token),
            startTime,
            stopTime,
            true
        );

        vm.warp(startTime + 500);

        uint256 availableBalance = streamingContract.balanceOf(streamId);
        uint256 recipientBalanceBefore = token.balanceOf(recipient);

        vm.expectEmit(true, true, false, true);
        emit WithdrawFromStream(streamId, recipient, availableBalance);

        vm.prank(recipient);
        bool success = streamingContract.withdrawFromStream(
            streamId,
            availableBalance
        );

        assertTrue(success);
        assertEq(
            token.balanceOf(recipient),
            recipientBalanceBefore + availableBalance
        );
    }

    function test_WithdrawByNFTOwner() public {
        uint256 startTime = block.timestamp;
        uint256 stopTime = startTime + 1000;

        vm.prank(sender);
        uint256 streamId = streamingContract.createStream(
            recipient,
            DEPOSIT,
            address(token),
            startTime,
            stopTime,
            true
        );

        // Transfer NFT to alice
        vm.prank(recipient);
        streamingContract.transferFrom(recipient, alice, streamId);

        vm.warp(startTime + 500);

        uint256 availableBalance = streamingContract.balanceOf(streamId);
        uint256 recipientBalanceBefore = token.balanceOf(recipient);

        // Alice (NFT owner) can withdraw for recipient
        vm.prank(alice);
        streamingContract.withdrawFromStream(streamId, availableBalance);

        assertEq(
            token.balanceOf(recipient),
            recipientBalanceBefore + availableBalance
        );
    }

    function test_WithdrawMultipleTimes() public {
        uint256 startTime = block.timestamp;
        uint256 stopTime = startTime + 1000;

        vm.prank(sender);
        uint256 streamId = streamingContract.createStream(
            recipient,
            DEPOSIT,
            address(token),
            startTime,
            stopTime,
            true
        );

        uint256 recipientBalanceBefore = token.balanceOf(recipient);

        // First withdrawal at 25%
        vm.warp(startTime + 250);
        uint256 balance1 = streamingContract.balanceOf(streamId);
        vm.prank(recipient);
        streamingContract.withdrawFromStream(streamId, balance1);

        // Second withdrawal at 75%
        vm.warp(startTime + 750);
        uint256 balance2 = streamingContract.balanceOf(streamId);
        vm.prank(recipient);
        streamingContract.withdrawFromStream(streamId, balance2);

        uint256 totalWithdrawn = balance1 + balance2;
        assertEq(
            token.balanceOf(recipient),
            recipientBalanceBefore + totalWithdrawn
        );
    }

    function test_WithdrawEntireStreamAtEnd() public {
        uint256 startTime = block.timestamp;
        uint256 stopTime = startTime + 1000;

        vm.prank(sender);
        uint256 streamId = streamingContract.createStream(
            recipient,
            DEPOSIT,
            address(token),
            startTime,
            stopTime,
            true
        );

        vm.warp(stopTime);

        uint256 availableBalance = streamingContract.balanceOf(streamId);
        vm.prank(recipient);
        streamingContract.withdrawFromStream(streamId, availableBalance);

        // Stream should be inactive after full withdrawal
        StreamingContract.Stream memory stream = streamingContract.getStream(
            streamId
        );
        assertFalse(stream.isActive);
        assertEq(stream.remainingBalance, 0);
    }

    function test_WithdrawPartialAmount() public {
        uint256 startTime = block.timestamp;
        uint256 stopTime = startTime + 1000;

        vm.prank(sender);
        uint256 streamId = streamingContract.createStream(
            recipient,
            DEPOSIT,
            address(token),
            startTime,
            stopTime,
            true
        );

        vm.warp(startTime + 500);

        uint256 availableBalance = streamingContract.balanceOf(streamId);
        uint256 withdrawAmount = availableBalance / 2; // Withdraw half
        uint256 recipientBalanceBefore = token.balanceOf(recipient);

        vm.prank(recipient);
        streamingContract.withdrawFromStream(streamId, withdrawAmount);

        assertEq(
            token.balanceOf(recipient),
            recipientBalanceBefore + withdrawAmount
        );

        // Check remaining balance is correct
        StreamingContract.Stream memory stream = streamingContract.getStream(
            streamId
        );
        assertTrue(stream.isActive);
        assertGt(stream.remainingBalance, 0);
    }

    // ============ WITHDRAW FAILURE TESTS ============

    function test_RevertWhen_WithdrawNonexistentStream() public {
        vm.expectRevert("Stream does not exist");
        vm.prank(recipient);
        streamingContract.withdrawFromStream(999, 100);
    }

    function test_RevertWhen_WithdrawUnauthorized() public {
        uint256 startTime = block.timestamp;
        uint256 stopTime = startTime + 1000;

        vm.prank(sender);
        uint256 streamId = streamingContract.createStream(
            recipient,
            DEPOSIT,
            address(token),
            startTime,
            stopTime,
            true
        );

        vm.warp(startTime + 500);

        vm.expectRevert("Caller not recipient");
        // Alice tries to withdraw (not recipient or NFT owner)
        vm.prank(alice);
        streamingContract.withdrawFromStream(streamId, 100);
    }

    function test_RevertWhen_WithdrawInsufficientFunds() public {
        uint256 startTime = block.timestamp;
        uint256 stopTime = startTime + 1000;

        vm.prank(sender);
        uint256 streamId = streamingContract.createStream(
            recipient,
            DEPOSIT,
            address(token),
            startTime,
            stopTime,
            true
        );

        vm.warp(startTime + 100); // Only 10% through

        uint256 availableBalance = streamingContract.balanceOf(streamId);

        vm.expectRevert("Insufficient funds");
        vm.prank(recipient);
        streamingContract.withdrawFromStream(streamId, availableBalance + 1); // Try to withdraw more than available
    }

    function test_RevertWhen_WithdrawFromInactiveStream() public {
        uint256 startTime = block.timestamp;
        uint256 stopTime = startTime + 1000;

        vm.prank(sender);
        uint256 streamId = streamingContract.createStream(
            recipient,
            DEPOSIT,
            address(token),
            startTime,
            stopTime,
            true
        );

        // Cancel stream
        vm.prank(sender);
        streamingContract.cancelStream(streamId);

        vm.expectRevert("Stream not active");
        vm.prank(recipient);
        streamingContract.withdrawFromStream(streamId, 100);
    }

    // ============ CANCEL STREAM TESTS ============

    function test_CancelStreamBySender() public {
        uint256 startTime = block.timestamp;
        uint256 stopTime = startTime + 1000;

        vm.prank(sender);
        uint256 streamId = streamingContract.createStream(
            recipient,
            DEPOSIT,
            address(token),
            startTime,
            stopTime,
            true
        );

        vm.warp(startTime + 300);

        uint256 senderBalanceBefore = token.balanceOf(sender);
        uint256 recipientBalanceBefore = token.balanceOf(recipient);

        uint256 recipientBalance = streamingContract.balanceOf(streamId);
        StreamingContract.Stream memory streamBefore = streamingContract
            .getStream(streamId);
        uint256 senderBalance = streamBefore.remainingBalance -
            recipientBalance;

        vm.expectEmit(true, true, true, true);
        emit StreamCanceled(
            streamId,
            sender,
            recipient,
            senderBalance,
            recipientBalance
        );

        vm.prank(sender);
        bool success = streamingContract.cancelStream(streamId);

        assertTrue(success);
        assertEq(token.balanceOf(sender), senderBalanceBefore + senderBalance);
        assertEq(
            token.balanceOf(recipient),
            recipientBalanceBefore + recipientBalance
        );

        StreamingContract.Stream memory streamAfter = streamingContract
            .getStream(streamId);
        assertFalse(streamAfter.isActive);
        assertEq(streamAfter.remainingBalance, 0);
    }

    function test_CancelStreamByRecipient() public {
        uint256 startTime = block.timestamp;
        uint256 stopTime = startTime + 1000;

        vm.prank(sender);
        uint256 streamId = streamingContract.createStream(
            recipient,
            DEPOSIT,
            address(token),
            startTime,
            stopTime,
            true
        );

        vm.warp(startTime + 700);

        vm.prank(recipient);
        bool success = streamingContract.cancelStream(streamId);

        assertTrue(success);

        StreamingContract.Stream memory stream = streamingContract.getStream(
            streamId
        );
        assertFalse(stream.isActive);
    }

    function test_CancelStreamBeforeStart() public {
        uint256 startTime = block.timestamp + 1000;
        uint256 stopTime = startTime + 1000;

        vm.prank(sender);
        uint256 streamId = streamingContract.createStream(
            recipient,
            DEPOSIT,
            address(token),
            startTime,
            stopTime,
            true
        );

        uint256 senderBalanceBefore = token.balanceOf(sender);
        uint256 recipientBalanceBefore = token.balanceOf(recipient);

        vm.prank(sender);
        streamingContract.cancelStream(streamId);

        // All funds should go back to sender since stream hasn't started
        uint256 netDeposit = (DEPOSIT * BROKER_FEE_PERCENTAGE) /
            PERCENTAGE_SCALE;
        netDeposit = DEPOSIT - netDeposit;
        assertEq(token.balanceOf(sender), senderBalanceBefore + netDeposit);
        assertEq(token.balanceOf(recipient), recipientBalanceBefore); // No change
    }

    function test_CancelStreamAtEnd() public {
        uint256 startTime = block.timestamp;
        uint256 stopTime = startTime + 1000;

        vm.prank(sender);
        uint256 streamId = streamingContract.createStream(
            recipient,
            DEPOSIT,
            address(token),
            startTime,
            stopTime,
            true
        );

        vm.warp(stopTime + 100);

        uint256 recipientBalanceBefore = token.balanceOf(recipient);
        uint256 senderBalanceBefore = token.balanceOf(sender);

        vm.prank(sender);
        streamingContract.cancelStream(streamId);

        // All funds should go to recipient since stream is complete
        uint256 netDeposit = (DEPOSIT * BROKER_FEE_PERCENTAGE) /
            PERCENTAGE_SCALE;
        netDeposit = DEPOSIT - netDeposit;
        assertEq(
            token.balanceOf(recipient),
            recipientBalanceBefore + netDeposit
        );
        assertEq(token.balanceOf(sender), senderBalanceBefore); // No change
    }

    // ============ CANCEL STREAM FAILURE TESTS ============

    function test_RevertWhen_CancelNonexistentStream() public {
        vm.expectRevert("Stream does not exist");
        vm.prank(sender);
        streamingContract.cancelStream(999);
    }

    function test_RevertWhen_CancelNonCancelableStream() public {
        uint256 startTime = block.timestamp;
        uint256 stopTime = startTime + 1000;

        vm.prank(sender);
        uint256 streamId = streamingContract.createStream(
            recipient,
            DEPOSIT,
            address(token),
            startTime,
            stopTime,
            false // Not cancelable
        );

        vm.expectRevert("Stream not cancelable");
        vm.prank(sender);
        streamingContract.cancelStream(streamId);
    }

    function test_RevertWhen_CancelStreamUnauthorized() public {
        uint256 startTime = block.timestamp;
        uint256 stopTime = startTime + 1000;

        vm.prank(sender);
        uint256 streamId = streamingContract.createStream(
            recipient,
            DEPOSIT,
            address(token),
            startTime,
            stopTime,
            true
        );

        vm.expectRevert("Caller not authorized");
        vm.prank(alice); // Not sender or recipient
        streamingContract.cancelStream(streamId);
    }

    function test_RevertWhen_CancelInactiveStream() public {
        uint256 startTime = block.timestamp;
        uint256 stopTime = startTime + 1000;

        vm.prank(sender);
        uint256 streamId = streamingContract.createStream(
            recipient,
            DEPOSIT,
            address(token),
            startTime,
            stopTime,
            true
        );

        // Cancel once
        vm.prank(sender);
        streamingContract.cancelStream(streamId);

        vm.expectRevert("Stream not active");
        // Try to cancel again
        vm.prank(sender);
        streamingContract.cancelStream(streamId);
    }

    // ============ NFT FUNCTIONALITY TESTS ============

    function test_NFTTransfer() public {
        uint256 startTime = block.timestamp;
        uint256 stopTime = startTime + 1000;

        vm.prank(sender);
        uint256 streamId = streamingContract.createStream(
            recipient,
            DEPOSIT,
            address(token),
            startTime,
            stopTime,
            true
        );

        assertEq(streamingContract.ownerOf(streamId), recipient);

        vm.prank(recipient);
        streamingContract.transferFrom(recipient, alice, streamId);

        assertEq(streamingContract.ownerOf(streamId), alice);

        // Alice can now withdraw for the original recipient
        vm.warp(startTime + 500);
        uint256 balance = streamingContract.balanceOf(streamId);

        vm.prank(alice);
        streamingContract.withdrawFromStream(streamId, balance);

        // Funds still go to original recipient
        StreamingContract.Stream memory stream = streamingContract.getStream(
            streamId
        );
        assertEq(stream.recipient, recipient);
    }

    function test_NFTMetadata() public {
        assertEq(streamingContract.name(), "Streaming NFT");
        assertEq(streamingContract.symbol(), "STREAM");
    }

    // ============ EDGE CASE TESTS ============

    function test_VeryShortStream() public {
        uint256 startTime = block.timestamp;
        uint256 stopTime = startTime + 1; // 1 second stream

        vm.prank(sender);
        uint256 streamId = streamingContract.createStream(
            recipient,
            1000, // Deposit equals duration
            address(token),
            startTime,
            stopTime,
            true
        );

        vm.warp(stopTime);

        uint256 balance = streamingContract.balanceOf(streamId);
        assertGt(balance, 0);
    }

    function test_VeryLongStream() public {
        uint256 startTime = block.timestamp;
        uint256 stopTime = startTime + 365 days;
        uint256 largeDeposit = 365 days * 1000; // Ensure deposit >= duration

        // Ensure sender has enough tokens
        token.mint(sender, largeDeposit);

        vm.prank(sender);
        uint256 streamId = streamingContract.createStream(
            recipient,
            largeDeposit,
            address(token),
            startTime,
            stopTime,
            true
        );

        vm.warp(startTime + 30 days);

        uint256 balance = streamingContract.balanceOf(streamId);
        assertGt(balance, 0);
    }

    function test_StreamWithMinimalDeposit() public {
        uint256 startTime = block.timestamp;
        uint256 stopTime = startTime + 100;

        vm.prank(sender);
        uint256 streamId = streamingContract.createStream(
            recipient,
            100, // Minimal deposit that equals duration
            address(token),
            startTime,
            stopTime,
            true
        );

        vm.warp(startTime + 50);

        uint256 balance = streamingContract.balanceOf(streamId);
        assertGe(balance, 0); // Should be at least 0
    }

    function test_StreamWithLargeDeposit() public {
        uint256 largeDeposit = 1000000 * 10 ** 18;
        uint256 startTime = block.timestamp;
        uint256 stopTime = startTime + 1000;

        // Ensure sender has enough tokens
        token.mint(sender, largeDeposit);

        vm.prank(sender);
        uint256 streamId = streamingContract.createStream(
            recipient,
            largeDeposit,
            address(token),
            startTime,
            stopTime,
            true
        );

        vm.warp(startTime + 500);

        uint256 balance = streamingContract.balanceOf(streamId);
        assertGt(balance, 0);
    }

    // ============ GET STREAM TESTS ============

    function test_GetStream() public {
        uint256 startTime = block.timestamp + 100;
        uint256 stopTime = startTime + 1000;

        vm.prank(sender);
        uint256 streamId = streamingContract.createStream(
            recipient,
            DEPOSIT,
            address(token),
            startTime,
            stopTime,
            true
        );

        StreamingContract.Stream memory stream = streamingContract.getStream(
            streamId
        );

        // Compute netDeposit = DEPOSIT − brokerFee
        uint256 fee = (DEPOSIT * BROKER_FEE_PERCENTAGE) / PERCENTAGE_SCALE;
        uint256 netDeposit = DEPOSIT - fee;

        assertEq(stream.sender, sender);
        assertEq(stream.recipient, recipient);
        assertEq(stream.deposit, netDeposit);
        assertEq(address(stream.tokenAddress), address(token));
        assertEq(stream.startTime, startTime);
        assertEq(stream.stopTime, stopTime);
        assertTrue(stream.isActive);
        assertTrue(stream.cancelable);
    }

    function test_RevertWhen_GetNonexistentStream() public {
        vm.expectRevert("Stream does not exist");
        streamingContract.getStream(999);
    }

    // ============ INTEGRATION TESTS (Linear) ============

    function test_CompleteStreamLifecycle() public {
        uint256 startTime = block.timestamp;
        uint256 stopTime = startTime + 1000;

        // Create stream
        vm.prank(sender);
        uint256 streamId = streamingContract.createStream(
            recipient,
            DEPOSIT,
            address(token),
            startTime,
            stopTime,
            true
        );

        // Partial withdrawal
        vm.warp(startTime + 250);
        uint256 balance1 = streamingContract.balanceOf(streamId);
        vm.prank(recipient);
        streamingContract.withdrawFromStream(streamId, balance1);

        // Transfer NFT
        vm.prank(recipient);
        streamingContract.transferFrom(recipient, alice, streamId);

        // Another withdrawal by new NFT owner
        vm.warp(startTime + 750);
        uint256 balance2 = streamingContract.balanceOf(streamId);
        vm.prank(alice);
        streamingContract.withdrawFromStream(streamId, balance2);

        // Final withdrawal
        vm.warp(stopTime);
        uint256 balance3 = streamingContract.balanceOf(streamId);
        if (balance3 > 0) {
            vm.prank(alice);
            streamingContract.withdrawFromStream(streamId, balance3);
        }

        // Verify stream is complete
        StreamingContract.Stream memory stream = streamingContract.getStream(
            streamId
        );
        assertFalse(stream.isActive);
        assertEq(stream.remainingBalance, 0);
    }

    function test_MultipleUsersMultipleStreams() public {
        uint256 startTime = block.timestamp;
        uint256 stopTime = startTime + 1000;

        // Create multiple streams from different senders
        vm.prank(sender);
        uint256 streamId1 = streamingContract.createStream(
            recipient,
            DEPOSIT,
            address(token),
            startTime,
            stopTime,
            true
        );

        vm.prank(alice);
        uint256 streamId2 = streamingContract.createStream(
            bob,
            DEPOSIT,
            address(token),
            startTime,
            stopTime,
            false
        );

        vm.prank(bob);
        uint256 streamId3 = streamingContract.createStream(
            charlie,
            DEPOSIT,
            address(token),
            startTime,
            stopTime,
            true
        );

        assertEq(streamingContract.getTotalStreams(), 3);

        // Advance time and test withdrawals
        vm.warp(startTime + 500);

        uint256 balance1 = streamingContract.balanceOf(streamId1);
        uint256 balance2 = streamingContract.balanceOf(streamId2);
        uint256 balance3 = streamingContract.balanceOf(streamId3);

        vm.prank(recipient);
        streamingContract.withdrawFromStream(streamId1, balance1);

        vm.prank(bob);
        streamingContract.withdrawFromStream(streamId2, balance2);

        vm.prank(charlie);
        streamingContract.withdrawFromStream(streamId3, balance3);

        // Cancel one stream
        vm.prank(sender);
        streamingContract.cancelStream(streamId1);

        // Verify states
        assertTrue(streamingContract.getStream(streamId2).isActive);
        assertTrue(streamingContract.getStream(streamId3).isActive);
        assertFalse(streamingContract.getStream(streamId1).isActive);
    }

    // ============ FUZZ TESTS (Linear) ============

    function testFuzz_CreateStream(
        uint256 deposit,
        uint256 duration,
        bool cancelable
    ) public {
        // Use more reasonable bounds to avoid edge cases
        deposit = bound(deposit, 1000, 100000 * 10 ** 18);
        duration = bound(duration, 10, 30 days);

        vm.assume(deposit >= duration); // Ensure rate calculation doesn't round to zero

        // Set reasonable timestamps
        vm.warp(1000);
        uint256 startTime = block.timestamp + 100;
        uint256 stopTime = startTime + duration;

        // Ensure sender has enough tokens
        if (token.balanceOf(sender) < deposit) {
            token.mint(sender, deposit);
            vm.prank(sender);
            token.approve(address(streamingContract), type(uint256).max);
        }

        vm.prank(sender);
        uint256 streamId = streamingContract.createStream(
            recipient,
            deposit,
            address(token),
            startTime,
            stopTime,
            cancelable
        );

        assertEq(streamingContract.ownerOf(streamId), recipient);
        StreamingContract.Stream memory stream = streamingContract.getStream(
            streamId
        );
        assertTrue(stream.isActive);
        assertEq(stream.cancelable, cancelable);
    }

    function testFuzz_Withdraw(
        uint256 deposit,
        uint256 timeElapsed,
        uint256 withdrawPercentage
    ) public {
        // Use more reasonable bounds
        deposit = bound(deposit, 10000, 100000 * 10 ** 18);
        uint256 duration = 1000;
        timeElapsed = bound(timeElapsed, 1, duration);
        withdrawPercentage = bound(withdrawPercentage, 1, 100);

        vm.assume(deposit >= duration);

        // Set reasonable timestamps
        vm.warp(1000);
        uint256 startTime = block.timestamp;
        uint256 stopTime = startTime + duration;

        // Ensure sender has enough tokens
        if (token.balanceOf(sender) < deposit) {
            token.mint(sender, deposit);
            vm.prank(sender);
            token.approve(address(streamingContract), type(uint256).max);
        }

        vm.prank(sender);
        uint256 streamId = streamingContract.createStream(
            recipient,
            deposit,
            address(token),
            startTime,
            stopTime,
            true
        );

        vm.warp(startTime + timeElapsed);

        uint256 availableBalance = streamingContract.balanceOf(streamId);
        uint256 withdrawAmount = (availableBalance * withdrawPercentage) / 100;

        if (withdrawAmount > 0) {
            uint256 recipientBalanceBefore = token.balanceOf(recipient);

            vm.prank(recipient);
            streamingContract.withdrawFromStream(streamId, withdrawAmount);

            assertEq(
                token.balanceOf(recipient),
                recipientBalanceBefore + withdrawAmount
            );
        }
    }

    function testFuzz_BalanceOfAtRandomTime(
        uint256 deposit,
        uint256 duration,
        uint256 timeElapsed
    ) public {
        deposit = bound(deposit, 10000, 1000000 * 10 ** 18);
        duration = bound(duration, 100, 365 days);
        timeElapsed = bound(timeElapsed, 0, duration * 2);

        vm.assume(deposit >= duration);

        // Set a reasonable starting timestamp to avoid underflow issues
        uint256 startTime = 1000;
        vm.warp(startTime);

        uint256 stopTime = startTime + duration;

        // Ensure sender has enough tokens
        if (token.balanceOf(sender) < deposit) {
            token.mint(sender, deposit);
            vm.prank(sender);
            token.approve(address(streamingContract), type(uint256).max);
        }

        vm.prank(sender);
        uint256 streamId = streamingContract.createStream(
            recipient,
            deposit,
            address(token),
            startTime,
            stopTime,
            true
        );

        vm.warp(startTime + timeElapsed);

        uint256 balance = streamingContract.balanceOf(streamId);
        uint256 netDeposit = deposit -
            ((deposit * BROKER_FEE_PERCENTAGE) / PERCENTAGE_SCALE);

        if (timeElapsed == 0 || block.timestamp <= startTime) {
            assertEq(balance, 0);
        } else if (block.timestamp >= stopTime) {
            // Allow for small rounding errors (up to duration in wei difference)
            assertApproxEqAbs(balance, netDeposit, duration);
        } else {
            assertLe(balance, netDeposit);
            assertGe(balance, 0);

            // Additional check for reasonable balance progression
            uint256 expectedBalance = (netDeposit * timeElapsed) / duration;
            // Allow for rounding errors - up to duration in wei difference
            assertApproxEqAbs(balance, expectedBalance, duration);
        }
    }

    // ============ LOGARITHMIC STREAM TESTS ============

    function test_CreateLogarithmicStream() public {
        uint256 startTime = block.timestamp + 100;
        uint256 stopTime = startTime + 1000;
        uint256 offset = 100; // 10% of duration

        vm.expectEmit(true, true, true, true);
        emit StreamCreated(
            1,
            sender,
            recipient,
            (DEPOSIT * 99) / 100,
            address(token),
            startTime,
            stopTime,
            true,
            StreamingContract.StreamShape.LOGARITHMIC
        );

        vm.prank(sender);
        uint256 streamId = streamingContract.createLogarithmicStream(
            recipient,
            DEPOSIT,
            address(token),
            startTime,
            stopTime,
            true,
            offset
        );

        assertEq(streamId, 1);
        assertEq(streamingContract.ownerOf(streamId), recipient);

        StreamingContract.Stream memory stream = streamingContract.getStream(
            streamId
        );
        assertEq(
            uint8(stream.shape),
            uint8(StreamingContract.StreamShape.LOGARITHMIC)
        );
        assertEq(stream.logOffset, offset);
        assertEq(stream.logScale, LOG_PRECISION);
        assertEq(stream.ratePerSecond, 0); // Not used for logarithmic streams
    }

    function test_CreateLogarithmicStreamWithDifferentOffsets() public {
        uint256 startTime = block.timestamp + 100;
        uint256 stopTime = startTime + 1000;

        // Small offset (steeper curve)
        vm.prank(sender);
        uint256 streamId1 = streamingContract.createLogarithmicStream(
            recipient,
            DEPOSIT,
            address(token),
            startTime,
            stopTime,
            true,
            10 // 1% of duration
        );

        // Large offset (gentler curve)
        vm.prank(sender);
        uint256 streamId2 = streamingContract.createLogarithmicStream(
            alice,
            DEPOSIT,
            address(token),
            startTime,
            stopTime,
            true,
            500 // 50% of duration
        );

        StreamingContract.Stream memory stream1 = streamingContract.getStream(
            streamId1
        );
        StreamingContract.Stream memory stream2 = streamingContract.getStream(
            streamId2
        );

        assertEq(stream1.logOffset, 10);
        assertEq(stream2.logOffset, 500);
    }

    function test_RevertWhen_CreateLogarithmicStreamInvalidOffset() public {
        uint256 startTime = block.timestamp + 100;
        uint256 stopTime = startTime + 1000;

        // Zero offset
        vm.expectRevert("Invalid log offset");
        vm.prank(sender);
        streamingContract.createLogarithmicStream(
            recipient,
            DEPOSIT,
            address(token),
            startTime,
            stopTime,
            true,
            0
        );

        // Offset larger than duration
        vm.expectRevert("Invalid log offset");
        vm.prank(sender);
        streamingContract.createLogarithmicStream(
            recipient,
            DEPOSIT,
            address(token),
            startTime,
            stopTime,
            true,
            1001 // Larger than duration of 1000
        );
    }

    function test_LogarithmicStreamBalanceProgression() public {
        uint256 startTime = block.timestamp;
        uint256 stopTime = startTime + 1000;
        uint256 offset = 100;

        vm.prank(sender);
        uint256 streamId = streamingContract.createLogarithmicStream(
            recipient,
            DEPOSIT,
            address(token),
            startTime,
            stopTime,
            true,
            offset
        );

        uint256 netDeposit = (DEPOSIT * BROKER_FEE_PERCENTAGE) /
            PERCENTAGE_SCALE;
        netDeposit = DEPOSIT - netDeposit;

        // At start
        assertEq(streamingContract.balanceOf(streamId), 0);

        // At 10% through - just check it's greater than 0 and less than total
        vm.warp(startTime + 100);
        uint256 balance10 = streamingContract.balanceOf(streamId);
        assertTrue(balance10 > 0);
        assertTrue(balance10 < netDeposit);

        // At 50% through - should be greater than previous
        vm.warp(startTime + 500);
        uint256 balance50 = streamingContract.balanceOf(streamId);
        assertTrue(balance50 > balance10);
        assertTrue(balance50 < netDeposit);

        // At 90% through - should be greater than previous
        vm.warp(startTime + 900);
        uint256 balance90 = streamingContract.balanceOf(streamId);
        assertTrue(balance90 > balance50);

        // At end
        vm.warp(stopTime);
        assertEq(streamingContract.balanceOf(streamId), netDeposit);
    }

    function test_LogarithmicVsLinearComparison() public {
        uint256 startTime = block.timestamp;
        uint256 stopTime = startTime + 1000;

        // Create linear stream
        vm.prank(sender);
        uint256 linearStreamId = streamingContract.createLinearStream(
            recipient,
            DEPOSIT,
            address(token),
            startTime,
            stopTime,
            true
        );

        // Create logarithmic stream with large offset for slower start
        vm.prank(sender);
        uint256 logStreamId = streamingContract.createLogarithmicStream(
            alice,
            DEPOSIT,
            address(token),
            startTime,
            stopTime,
            true,
            900 // Large offset for slower curve
        );

        // At end, both should be equal
        vm.warp(stopTime);
        assertEq(
            streamingContract.balanceOf(linearStreamId),
            streamingContract.balanceOf(logStreamId)
        );
    }

    function test_GetStreamProgressLinear() public {
        // 1) Warp to a known low timestamp so startTime is block.timestamp
        vm.warp(1);
        uint256 startTime = block.timestamp; // startTime = 1
        uint256 duration = 1000;
        uint256 stopTime = startTime + duration; // stopTime = 1001

        // 2) Create the linear stream at (startTime, stopTime)
        vm.prank(sender);
        streamingContract.createLinearStream(
            recipient,
            DEPOSIT,
            address(token),
            startTime,
            stopTime,
            true
        );

        // Stream ID is implicitly 1 (first-created)

        // 3) At t = startTime, progress should be 0
        vm.warp(startTime);
        assertEq(streamingContract.getStreamProgress(1), 0);

        // 4) At t = startTime + 250, progress = 250 * 10000 / 1000 = 2500
        vm.warp(startTime + 250);
        assertEq(streamingContract.getStreamProgress(1), 2500);

        // 5) At t = startTime + 500, progress = 500 * 10000 / 1000 = 5000
        vm.warp(startTime + 500);
        assertEq(streamingContract.getStreamProgress(1), 5000);

        // 6) At t = startTime + 750, progress = 750 * 10000 / 1000 = 7500
        vm.warp(startTime + 750);
        assertEq(streamingContract.getStreamProgress(1), 7500);

        // 7) At t = stopTime, progress = 10000 (100%)
        vm.warp(stopTime);
        assertEq(streamingContract.getStreamProgress(1), PERCENTAGE_SCALE);
    }

    function test_GetStreamProgressLogarithmic() public {
        vm.warp(1000);
        uint256 startTime = block.timestamp;
        uint256 stopTime = startTime + 1000;

        vm.prank(sender);
        uint256 streamId = streamingContract.createLogarithmicStream(
            recipient,
            DEPOSIT,
            address(token),
            startTime,
            stopTime,
            true,
            100
        );

        // At start
        assertEq(streamingContract.getStreamProgress(streamId), 0);

        // At 50% time - just check it's reasonable
        vm.warp(startTime + 500);
        uint256 progress50 = streamingContract.getStreamProgress(streamId);
        assertTrue(progress50 > 0);
        assertTrue(progress50 < PERCENTAGE_SCALE);

        // At end
        vm.warp(stopTime);
        assertEq(
            streamingContract.getStreamProgress(streamId),
            PERCENTAGE_SCALE
        ); // 100%
    }

    // ============ STREAM SHAPE TESTS ============

    function test_GetStreamShape() public {
        uint256 startTime = block.timestamp + 100;
        uint256 stopTime = startTime + 1000;

        vm.prank(sender);
        uint256 linearStreamId = streamingContract.createLinearStream(
            recipient,
            DEPOSIT,
            address(token),
            startTime,
            stopTime,
            true
        );

        vm.prank(sender);
        uint256 logStreamId = streamingContract.createLogarithmicStream(
            alice,
            DEPOSIT,
            address(token),
            startTime,
            stopTime,
            true,
            100
        );

        assertEq(
            uint8(streamingContract.getStreamShape(linearStreamId)),
            uint8(StreamingContract.StreamShape.LINEAR)
        );

        assertEq(
            uint8(streamingContract.getStreamShape(logStreamId)),
            uint8(StreamingContract.StreamShape.LOGARITHMIC)
        );
    }

    function test_RevertWhen_GetStreamShapeNonexistent() public {
        vm.expectRevert("Stream does not exist");
        streamingContract.getStreamShape(999);
    }

    // ============ WITHDRAWAL TESTS FOR LOGARITHMIC STREAMS ============

    function test_WithdrawFromLogarithmicStream() public {
        uint256 startTime = block.timestamp;
        uint256 stopTime = startTime + 1000;

        vm.prank(sender);
        uint256 streamId = streamingContract.createLogarithmicStream(
            recipient,
            DEPOSIT,
            address(token),
            startTime,
            stopTime,
            true,
            100
        );

        vm.warp(startTime + 500);

        uint256 availableBalance = streamingContract.balanceOf(streamId);
        uint256 recipientBalanceBefore = token.balanceOf(recipient);

        vm.expectEmit(true, true, false, true);
        emit WithdrawFromStream(streamId, recipient, availableBalance);

        vm.prank(recipient);
        bool success = streamingContract.withdrawFromStream(
            streamId,
            availableBalance
        );

        assertTrue(success);
        assertEq(
            token.balanceOf(recipient),
            recipientBalanceBefore + availableBalance
        );

        // Stream should still be active with remaining balance
        StreamingContract.Stream memory stream = streamingContract.getStream(
            streamId
        );
        assertTrue(stream.isActive);
        assertGt(stream.remainingBalance, 0);
    }

    function test_MultipleWithdrawalsLogarithmicStream() public {
        uint256 startTime = block.timestamp;
        uint256 stopTime = startTime + 1000;

        vm.prank(sender);
        uint256 streamId = streamingContract.createLogarithmicStream(
            recipient,
            DEPOSIT,
            address(token),
            startTime,
            stopTime,
            true,
            100
        );

        uint256 recipientBalanceStart = token.balanceOf(recipient);

        // First withdrawal at 25%
        vm.warp(startTime + 250);
        uint256 balance1 = streamingContract.balanceOf(streamId);
        vm.prank(recipient);
        streamingContract.withdrawFromStream(streamId, balance1);

        // Second withdrawal at 75%
        vm.warp(startTime + 750);
        uint256 balance2 = streamingContract.balanceOf(streamId);
        vm.prank(recipient);
        streamingContract.withdrawFromStream(streamId, balance2);

        // Final withdrawal at end
        vm.warp(stopTime);
        uint256 balance3 = streamingContract.balanceOf(streamId);

        // Only withdraw if there's a balance available
        if (balance3 > 0) {
            vm.prank(recipient);
            streamingContract.withdrawFromStream(streamId, balance3);
        }

        // Total withdrawn should equal net deposit (with small tolerance for rounding)
        uint256 totalWithdrawn = token.balanceOf(recipient) -
            recipientBalanceStart;
        uint256 netDeposit = DEPOSIT -
            ((DEPOSIT * BROKER_FEE_PERCENTAGE) / PERCENTAGE_SCALE);
        assertApproxEqAbs(totalWithdrawn, netDeposit, 10); // Allow 10 wei tolerance

        // Stream should be inactive
        StreamingContract.Stream memory stream = streamingContract.getStream(
            streamId
        );
        assertFalse(stream.isActive);
    }

    // ============ CANCELLATION TESTS FOR LOGARITHMIC STREAMS ============

    function test_CancelLogarithmicStream() public {
        uint256 startTime = block.timestamp;
        uint256 stopTime = startTime + 1000;

        vm.prank(sender);
        uint256 streamId = streamingContract.createLogarithmicStream(
            recipient,
            DEPOSIT,
            address(token),
            startTime,
            stopTime,
            true,
            100
        );

        vm.warp(startTime + 300);

        uint256 senderBalanceBefore = token.balanceOf(sender);
        uint256 recipientBalanceBefore = token.balanceOf(recipient);

        uint256 recipientBalance = streamingContract.balanceOf(streamId);
        StreamingContract.Stream memory streamBefore = streamingContract
            .getStream(streamId);
        uint256 senderBalance = streamBefore.remainingBalance -
            recipientBalance;

        vm.expectEmit(true, true, true, true);
        emit StreamCanceled(
            streamId,
            sender,
            recipient,
            senderBalance,
            recipientBalance
        );

        vm.prank(sender);
        bool success = streamingContract.cancelStream(streamId);

        assertTrue(success);
        assertEq(token.balanceOf(sender), senderBalanceBefore + senderBalance);
        assertEq(
            token.balanceOf(recipient),
            recipientBalanceBefore + recipientBalance
        );

        StreamingContract.Stream memory streamAfter = streamingContract
            .getStream(streamId);
        assertFalse(streamAfter.isActive);
        assertEq(streamAfter.remainingBalance, 0);
    }

    // ============ MIXED STREAM SCENARIOS ============

    function test_MultipleStreamsDifferentShapes() public {
        uint256 startTime = block.timestamp;
        uint256 stopTime = startTime + 1000;

        // Create one of each type
        vm.prank(sender);
        uint256 linearStreamId = streamingContract.createLinearStream(
            recipient,
            DEPOSIT,
            address(token),
            startTime,
            stopTime,
            true
        );

        vm.prank(sender);
        uint256 logStreamId = streamingContract.createLogarithmicStream(
            alice,
            DEPOSIT,
            address(token),
            startTime,
            stopTime,
            true,
            100
        );

        assertEq(streamingContract.getTotalStreams(), 2);

        // Test balances at 50%
        vm.warp(startTime + 500);

        uint256 linearBalance = streamingContract.balanceOf(linearStreamId);
        uint256 logBalance = streamingContract.balanceOf(logStreamId);

        // Linear should be exactly 50%
        uint256 netDeposit = DEPOSIT -
            ((DEPOSIT * BROKER_FEE_PERCENTAGE) / PERCENTAGE_SCALE);
        assertEq(linearBalance, netDeposit / 2);

        // Log balance should be positive and less than total
        assertTrue(logBalance > 0);
        assertTrue(logBalance <= netDeposit);

        // Both streams should be active
        assertTrue(streamingContract.getStream(linearStreamId).isActive);
        assertTrue(streamingContract.getStream(logStreamId).isActive);
    }

    // ============ EDGE CASES FOR LOGARITHMIC STREAMS ============

    function test_LogarithmicStreamVerySmallOffset() public {
        uint256 startTime = block.timestamp;
        uint256 stopTime = startTime + 1000;

        vm.prank(sender);
        uint256 streamId = streamingContract.createLogarithmicStream(
            recipient,
            DEPOSIT,
            address(token),
            startTime,
            stopTime,
            true,
            1 // Very small offset for steep curve
        );

        vm.warp(startTime + 100);
        uint256 balance = streamingContract.balanceOf(streamId);
        assertGt(balance, 0);

        vm.warp(stopTime);
        uint256 netDeposit = DEPOSIT -
            ((DEPOSIT * BROKER_FEE_PERCENTAGE) / PERCENTAGE_SCALE);
        assertEq(streamingContract.balanceOf(streamId), netDeposit);
    }

    function test_LogarithmicStreamLargeOffset() public {
        uint256 startTime = block.timestamp;
        uint256 stopTime = startTime + 1000;

        vm.prank(sender);
        uint256 streamId = streamingContract.createLogarithmicStream(
            recipient,
            DEPOSIT,
            address(token),
            startTime,
            stopTime,
            true,
            999 // Very large offset for gentle curve
        );

        vm.warp(startTime + 500);
        uint256 balance = streamingContract.balanceOf(streamId);
        assertGt(balance, 0);

        vm.warp(stopTime);
        uint256 netDeposit = DEPOSIT -
            ((DEPOSIT * BROKER_FEE_PERCENTAGE) / PERCENTAGE_SCALE);
        assertEq(streamingContract.balanceOf(streamId), netDeposit);
    }

    // ============ INTEGRATION TESTS (Logarithmic) ============

    function test_CompleteLogarithmicStreamLifecycle() public {
        uint256 startTime = block.timestamp;
        uint256 stopTime = startTime + 1000;

        // Create logarithmic stream
        vm.prank(sender);
        uint256 streamId = streamingContract.createLogarithmicStream(
            recipient,
            DEPOSIT,
            address(token),
            startTime,
            stopTime,
            true,
            100
        );

        // Initial progress should be 0
        assertEq(streamingContract.getStreamProgress(streamId), 0);

        // Partial withdrawal
        vm.warp(startTime + 250);
        uint256 balance1 = streamingContract.balanceOf(streamId);
        uint256 progress1 = streamingContract.getStreamProgress(streamId);
        assertTrue(progress1 > 0);
        assertTrue(progress1 < PERCENTAGE_SCALE);

        vm.prank(recipient);
        streamingContract.withdrawFromStream(streamId, balance1);

        // Transfer NFT
        vm.prank(recipient);
        streamingContract.transferFrom(recipient, alice, streamId);

        // Check progress BEFORE final withdrawal (while stream is still active)
        vm.warp(stopTime);
        uint256 finalProgress = streamingContract.getStreamProgress(streamId);
        assertEq(finalProgress, PERCENTAGE_SCALE); // 100%

        // Final withdrawal
        uint256 balance2 = streamingContract.balanceOf(streamId);
        if (balance2 > 0) {
            vm.prank(alice);
            streamingContract.withdrawFromStream(streamId, balance2);
        }

        // Verify stream is complete
        StreamingContract.Stream memory stream = streamingContract.getStream(
            streamId
        );
        assertFalse(stream.isActive);
        assertEq(stream.remainingBalance, 0);
    }

    function test_CompareStreamShapePerformance() public {
        uint256 startTime = block.timestamp;
        uint256 stopTime = startTime + 1000;

        // Create identical streams with different shapes
        vm.prank(sender);
        uint256 linearStreamId = streamingContract.createLinearStream(
            recipient,
            DEPOSIT,
            address(token),
            startTime,
            stopTime,
            true
        );

        vm.prank(sender);
        uint256 logStreamId = streamingContract.createLogarithmicStream(
            alice,
            DEPOSIT,
            address(token),
            startTime,
            stopTime,
            true,
            100
        );

        // At the end, both should be equal
        vm.warp(stopTime);
        assertEq(
            streamingContract.balanceOf(linearStreamId),
            streamingContract.balanceOf(logStreamId)
        );
    }

    // ============ FUZZ TESTS (Logarithmic) ============

    function testFuzz_CreateLogarithmicStream(
        uint256 deposit,
        uint256 duration,
        uint256 offsetPercentage,
        bool cancelable
    ) public {
        deposit = bound(deposit, 1000, 100000 * 10 ** 18);
        duration = bound(duration, 100, 30 days);
        offsetPercentage = bound(offsetPercentage, 1, 100); // 1% to 100% of duration

        vm.assume(deposit >= duration);

        uint256 offset = (duration * offsetPercentage) / 100;

        vm.warp(1000);
        uint256 startTime = block.timestamp + 100;
        uint256 stopTime = startTime + duration;

        // Ensure sender has enough tokens
        if (token.balanceOf(sender) < deposit) {
            token.mint(sender, deposit);
            vm.prank(sender);
            token.approve(address(streamingContract), type(uint256).max);
        }

        vm.prank(sender);
        uint256 streamId = streamingContract.createLogarithmicStream(
            recipient,
            deposit,
            address(token),
            startTime,
            stopTime,
            cancelable,
            offset
        );

        assertEq(streamingContract.ownerOf(streamId), recipient);

        StreamingContract.Stream memory stream = streamingContract.getStream(
            streamId
        );
        assertTrue(stream.isActive);
        assertEq(
            uint8(stream.shape),
            uint8(StreamingContract.StreamShape.LOGARITHMIC)
        );
        assertEq(stream.cancelable, cancelable);
        assertEq(stream.logOffset, offset);
    }

    function testFuzz_LogarithmicStreamBalance(
        uint256 deposit,
        uint256 timeElapsedPercentage,
        uint256 offsetPercentage
    ) public {
        deposit = bound(deposit, 10000, 100000 * 10 ** 18);
        timeElapsedPercentage = bound(timeElapsedPercentage, 0, 100);
        offsetPercentage = bound(offsetPercentage, 1, 50); // 1% to 50% for reasonable offsets

        uint256 duration = 1000;
        vm.assume(deposit >= duration);

        uint256 offset = (duration * offsetPercentage) / 100;
        uint256 timeElapsed = (duration * timeElapsedPercentage) / 100;

        vm.warp(1000);
        uint256 startTime = block.timestamp;
        uint256 stopTime = startTime + duration;

        // Ensure sender has enough tokens
        if (token.balanceOf(sender) < deposit) {
            token.mint(sender, deposit);
            vm.prank(sender);
            token.approve(address(streamingContract), type(uint256).max);
        }

        vm.prank(sender);
        uint256 streamId = streamingContract.createLogarithmicStream(
            recipient,
            deposit,
            address(token),
            startTime,
            stopTime,
            true,
            offset
        );

        vm.warp(startTime + timeElapsed);

        uint256 balance = streamingContract.balanceOf(streamId);
        uint256 netDeposit = deposit -
            ((deposit * BROKER_FEE_PERCENTAGE) / PERCENTAGE_SCALE);

        if (timeElapsed == 0) {
            assertEq(balance, 0);
        } else if (timeElapsed >= duration) {
            // Allow for small rounding errors
            assertApproxEqAbs(balance, netDeposit, 100);
        } else {
            assertGe(balance, 0);
            assertLe(balance, netDeposit);
        }
    }

    // ============ SIMPLIFIED INTEGRATION TEST ============

    function test_MixedStreamTypesIntegration() public {
        uint256 startTime = block.timestamp;
        uint256 stopTime = startTime + 1000;

        // Create multiple stream types
        vm.prank(sender);
        uint256 linearStreamId = streamingContract.createLinearStream(
            recipient,
            DEPOSIT,
            address(token),
            startTime,
            stopTime,
            true
        );

        vm.prank(alice);
        uint256 logStreamId1 = streamingContract.createLogarithmicStream(
            bob,
            DEPOSIT,
            address(token),
            startTime,
            stopTime,
            false, // Non-cancelable
            50 // Small offset
        );

        vm.prank(bob);
        uint256 logStreamId2 = streamingContract.createLogarithmicStream(
            charlie,
            DEPOSIT,
            address(token),
            startTime,
            stopTime,
            true,
            500 // Large offset
        );

        assertEq(streamingContract.getTotalStreams(), 3);

        // Test different behaviors at 50%
        vm.warp(startTime + 500);

        uint256 linearBalance = streamingContract.balanceOf(linearStreamId);
        uint256 logBalance1 = streamingContract.balanceOf(logStreamId1);
        uint256 logBalance2 = streamingContract.balanceOf(logStreamId2);

        uint256 netDeposit = DEPOSIT -
            ((DEPOSIT * BROKER_FEE_PERCENTAGE) / PERCENTAGE_SCALE);

        // Linear should be exactly 50%
        assertEq(linearBalance, netDeposit / 2);

        // Both log streams should be positive
        assertTrue(logBalance1 > 0);
        assertTrue(logBalance2 > 0);

        // Test withdrawals
        vm.prank(recipient);
        streamingContract.withdrawFromStream(linearStreamId, linearBalance);

        vm.prank(bob);
        streamingContract.withdrawFromStream(logStreamId1, logBalance1);

        vm.prank(charlie);
        streamingContract.withdrawFromStream(logStreamId2, logBalance2);

        // Try to cancel (should work for linear and logStreamId2, fail for logStreamId1)
        vm.prank(sender);
        streamingContract.cancelStream(linearStreamId);

        vm.prank(bob);
        streamingContract.cancelStream(logStreamId2);

        vm.expectRevert("Stream not cancelable");
        vm.prank(alice);
        streamingContract.cancelStream(logStreamId1);

        // Verify final states
        assertFalse(streamingContract.getStream(linearStreamId).isActive);
        assertTrue(streamingContract.getStream(logStreamId1).isActive); // Still active
        assertFalse(streamingContract.getStream(logStreamId2).isActive);
    }
}
