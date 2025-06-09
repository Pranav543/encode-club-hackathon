// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "../interfaces/IStreamingRecipient.sol";
import "@openzeppelin/contracts/utils/introspection/ERC165.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @title LendingHook
/// @notice Example hook that enables lending against streams
contract LendingHook is IStreamingRecipient, ERC165 {
    address public immutable STREAMING_CONTRACT;
    
    struct Loan {
        uint256 streamId;
        uint256 amount;
        uint256 interestRate;
        uint256 dueDate;
        bool isActive;
    }
    
    mapping(uint256 => Loan) public loans;
    mapping(address => uint256[]) public userLoans;
    
    event LoanCreated(uint256 indexed streamId, uint256 amount, uint256 interestRate);
    event LoanRepaid(uint256 indexed streamId, uint256 amount);
    
    constructor(address streamingContract) {
        STREAMING_CONTRACT = streamingContract;
    }
    
    modifier onlyStreamingContract() {
        require(msg.sender == STREAMING_CONTRACT, "Only streaming contract");
        _;
    }
    
    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC165, IERC165) returns (bool) {
        return interfaceId == type(IStreamingRecipient).interfaceId || super.supportsInterface(interfaceId);
    }
    
    function onStreamingWithdraw(
        uint256 streamId,
        address caller,
        address to,
        uint256 amount
    ) external onlyStreamingContract returns (bytes4) {
        // Auto-repay loan if there's an active loan for this stream
        Loan storage loan = loans[streamId];
        if (loan.isActive && amount >= loan.amount) {
            _repayLoan(streamId, loan.amount);
        }
        
        return IStreamingRecipient.onStreamingWithdraw.selector;
    }
    
    function onStreamingCancel(
        uint256 streamId,
        address sender,
        uint256 senderAmount,
        uint256 recipientAmount
    ) external onlyStreamingContract returns (bytes4) {
        // Handle loan repayment on stream cancellation
        Loan storage loan = loans[streamId];
        if (loan.isActive) {
            require(recipientAmount >= loan.amount, "Insufficient funds to repay loan");
            _repayLoan(streamId, loan.amount);
        }
        
        return IStreamingRecipient.onStreamingCancel.selector;
    }
    
    function createLoan(uint256 streamId, uint256 amount, uint256 interestRate) external {
        require(!loans[streamId].isActive, "Loan already exists");
        
        loans[streamId] = Loan({
            streamId: streamId,
            amount: amount,
            interestRate: interestRate,
            dueDate: block.timestamp + 365 days,
            isActive: true
        });
        
        userLoans[msg.sender].push(streamId);
        
        emit LoanCreated(streamId, amount, interestRate);
    }
    
    function _repayLoan(uint256 streamId, uint256 amount) internal {
        loans[streamId].isActive = false;
        emit LoanRepaid(streamId, amount);
    }
}
