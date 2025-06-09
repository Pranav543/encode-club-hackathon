# StreamingContract

A Solidity smart contract for creating and managing token streams with linear and logarithmic release schedules. This contract allows users to stream ERC20 tokens to a recipient over a defined period, with the option to make streams cancelable. The recipient receives an NFT representing their ownership of the stream.

## Features

-   **ERC20 Token Streaming**: Stream any ERC20 token.
-   **Multiple Stream Shapes**:
    -   **Linear**: Tokens are released at a constant rate over time.
    -   **Logarithmic**: Tokens are released more quickly at the beginning and slow down towards the end of the stream.
-   **Cancelable Streams**: Streams can be made cancelable by the sender or recipient (configurable).
-   **NFT Representation**: Each stream is represented by an ERC721 NFT, minted to the stream's recipient. This NFT can be transferred, allowing the stream ownership to be traded.
-   **Broker Fee**: A configurable percentage of the deposit is taken as a broker fee.
-   **Reentrancy Guard**: Protects against reentrancy attacks.
-   **Ownable**: Contract administration is managed by an owner.

## Project Structure

```
.
├── .env.example # Example environment variables
├── .gitignore
├── .gitmodules
├── foundry.toml # Foundry configuration
├── lib/ # Dependencies (forge-std, openzeppelin-contracts)
├── out/ # Compilation artifacts (ignored by git)
├── cache/ # Compiler cache (ignored by git)
├── script/ # Deployment scripts
│   └── StreamingContract.s.sol
├── src/ # Smart contracts
│   └── StreamingContract.sol
├── test/ # Tests
│   └── StreamingContract.t.sol
└── README.md
```

## Prerequisites

-   [Foundry](https://getfoundry.sh/)
-   [Node.js](https://nodejs.org/) (for managing dependencies or running scripts if you extend functionality)

## Setup

1.  **Clone the repository:**
    ```shell
    git clone <your-repo-url>
    cd lockup-stream
    ```

2.  **Install dependencies:**
    Foundry manages Solidity dependencies. Ensure submodules are initialized:
    ```shell
    git submodule update --init --recursive
    ```
    If you have `forge-std` and `openzeppelin-contracts` already installed globally or in your project, this step might be handled by `forge build`.

3.  **Set up environment variables:**
    Copy the example environment file and fill in your details:
    ```shell
    cp .env.example .env
    ```
    You'll need to provide:
    -   `PRIVATE_KEY`: The private key of the account you'll use for deployment and testing.
    -   `RPC_URL`: An RPC URL for the network you want to deploy to (e.g., a local Anvil node, or a testnet/mainnet RPC).

## Usage (Foundry)

### Build

Compile the smart contracts:
```shell
forge build
```

### Test

Run the test suite:
```shell
forge test
```
To see more detailed output (including gas reports or specific function calls), use verbose mode:
```shell
forge test -vvv
```

### Format

Format the Solidity code:
```shell
forge fmt
```

### Gas Snapshots

Generate gas usage snapshots for your functions:
```shell
forge snapshot
```

### Anvil (Local Blockchain)

Start a local development blockchain:
```shell
anvil
```
This will typically start a node at `http://127.0.0.1:8545` with pre-funded accounts.

### Deploy

Deploy the `StreamingContract` to a network.

1.  **Ensure your `.env` file is configured** with your `PRIVATE_KEY` and the target `RPC_URL`.
2.  **Run the deployment script:**
    The deployment script is located in `script/StreamingContract.s.sol`.
    ```shell
    forge script script/StreamingContract.s.sol:DeployScript --rpc-url $RPC_URL --private-key $PRIVATE_KEY --broadcast
    ```
    Replace `$RPC_URL` and `$PRIVATE_KEY` with your actual environment variables or directly paste the values if you prefer (though using env variables is safer). The `--broadcast` flag will send the transaction to the network.

    You can also use `vm.envString("RPC_URL")` and `vm.envUint("PRIVATE_KEY")` in your script to avoid passing them on the command line, provided they are set in your environment or `.env` file (Foundry automatically loads `.env`).

### Interacting with the Contract (Cast)

Foundry's `cast` tool allows you to interact with deployed smart contracts.

**Example: Creating a Linear Stream**

Assuming the contract is deployed and you have its address (`CONTRACT_ADDRESS`) and an ERC20 token address (`TOKEN_ADDRESS`):

1.  **Approve the StreamingContract to spend your tokens:**
    ```shell
    cast send $TOKEN_ADDRESS "approve(address,uint256)" $CONTRACT_ADDRESS <amount_to_approve> --private-key $YOUR_SENDER_PRIVATE_KEY --rpc-url $RPC_URL
    ```

2.  **Call `createLinearStream`:**
    ```shell
    cast send $CONTRACT_ADDRESS "createLinearStream(address,uint256,address,uint256,uint256,bool)" \
        $RECIPIENT_ADDRESS \
        $DEPOSIT_AMOUNT \
        $TOKEN_ADDRESS \
        $START_TIME_UNIX_TIMESTAMP \
        $STOP_TIME_UNIX_TIMESTAMP \
        true \
        --private-key $YOUR_SENDER_PRIVATE_KEY --rpc-url $RPC_URL
    ```
    *Replace placeholders like `$CONTRACT_ADDRESS`, `$RECIPIENT_ADDRESS`, etc., with actual values.*

**Example: Getting Stream Details**
```shell
cast call $CONTRACT_ADDRESS "getStream(uint256)" $STREAM_ID --rpc-url $RPC_URL
```

## Contract Details

### `Stream` Struct
```solidity
struct Stream {
    address sender;
    address recipient;
    uint256 deposit;
    IERC20 tokenAddress;
    uint256 startTime;
    uint256 stopTime;
    uint256 remainingBalance;
    uint256 ratePerSecond; // Only for linear streams
    bool isActive;
    bool cancelable;
    StreamShape shape;
    // Logarithmic curve parameters
    uint256 logScale;
    uint256 logOffset;
}
```

### `StreamShape` Enum
```solidity
enum StreamShape {
    LINEAR,
    LOGARITHMIC
}
```

### Key Functions

-   `createLinearStream(...) returns (uint256 streamId)`: Creates a stream with a linear release of tokens.
-   `createLogarithmicStream(...) returns (uint256 streamId)`: Creates a stream with a logarithmic release.
-   `balanceOf(uint256 streamId) returns (uint256 balance)`: Calculates the amount of tokens currently available for withdrawal from a stream.
-   `withdrawFromStream(uint256 streamId, uint256 amount) returns (bool)`: Allows the recipient (NFT owner) to withdraw available tokens.
-   `cancelStream(uint256 streamId) returns (bool)`: Cancels an active, cancelable stream. Unstreamed tokens are returned to the sender, and already streamed tokens are claimable by the recipient.
-   `getStream(uint256 streamId) returns (Stream memory)`: Retrieves the details of a specific stream.
-   `ownerOf(uint256 streamId) returns (address)`: Returns the owner of the NFT representing the stream (i.e., the stream recipient).

### Events

-   `StreamCreated(...)`
-   `WithdrawFromStream(...)`
-   `StreamCanceled(...)`

## Development & Testing

-   **Solidity Version**: `^0.8.19`
-   **Testing Framework**: Foundry Forge
-   **Dependencies**:
    -   OpenZeppelin Contracts: For `IERC20`, `SafeERC20`, `ERC721`, `ReentrancyGuard`, `Ownable`.
    -   Forge Standard Library: For testing utilities.

## Contributing

Contributions are welcome! Please follow standard coding practices, ensure tests pass, and update documentation as needed.

1.  Fork the repository.
2.  Create your feature branch (`git checkout -b feature/AmazingFeature`).
3.  Commit your changes (`git commit -m 'Add some AmazingFeature'`).
4.  Push to the branch (`git push origin feature/AmazingFeature`).
5.  Open a Pull Request.

## License

This project is licensed under the MIT License. See the `LICENSE` file for details (if one exists, otherwise assume MIT).
