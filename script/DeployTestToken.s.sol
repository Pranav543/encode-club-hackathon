// script/DeployTestToken.s.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "../src/examples/TestToken.sol";

contract DeployTestTokenScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console.log("Deploying TestToken with account:", deployer);
        console.log("Account balance:", deployer.balance);

        vm.startBroadcast(deployerPrivateKey);

        // Deploy simple test token
        TestToken token = new TestToken();

        console.log("TestToken deployed to:", address(token));
        console.log("Token name:", token.name());
        console.log("Token symbol:", token.symbol());
        console.log("Token decimals:", token.decimals());
        console.log("Total supply:", token.totalSupply());
        console.log("Owner:", token.owner());

        vm.stopBroadcast();

        // Save deployment address to file
        string memory deploymentInfo = string(
            abi.encodePacked(
                "TEST_TOKEN=", vm.toString(address(token)), "\n",
                "TOKEN_NAME=Demo Streaming Token\n",
                "TOKEN_SYMBOL=DEMO\n",
                "TOKEN_DECIMALS=18\n",
                "OWNER=", vm.toString(deployer), "\n"
            )
        );
        
        vm.writeFile("test-token-deployment.env", deploymentInfo);
        console.log("Deployment info saved to test-token-deployment.env");
        
        // Create frontend env file
        string memory frontendEnv = string(
            abi.encodePacked(
                "NEXT_PUBLIC_TEST_TOKEN_ADDRESS=", vm.toString(address(token)), "\n"
            )
        );
        
        vm.writeFile("frontend-token.env", frontendEnv);
        console.log("Frontend environment saved to frontend-token.env");
    }
}
