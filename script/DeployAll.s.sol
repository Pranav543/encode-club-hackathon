// script/DeployAll.s.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "../src/StreamingContract.sol";
import "../src/examples/LendingHook.sol";
import "../src/examples/NetworkSLA.sol";
import "../src/examples/MockPerformanceOracle.sol";

contract DeployAllScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console.log("Deploying with account:", deployer);
        console.log("Account balance:", deployer.balance);

        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy the main streaming contract
        StreamingContract streamingContract = new StreamingContract(deployer);
        console.log("StreamingContract deployed to:", address(streamingContract));

        // 2. Deploy mock performance oracle for SLA
        MockPerformanceOracle oracle = new MockPerformanceOracle();
        console.log("MockPerformanceOracle deployed to:", address(oracle));

        // 3. Deploy NetworkSLA contract
        NetworkSLA networkSLA = new NetworkSLA(
            address(streamingContract),
            address(oracle)
        );
        console.log("NetworkSLA deployed to:", address(networkSLA));

        // 4. Deploy LendingHook
        LendingHook lendingHook = new LendingHook(address(streamingContract));
        console.log("LendingHook deployed to:", address(lendingHook));

        // 5. Allowlist the LendingHook in StreamingContract
        streamingContract.allowlistHook(address(lendingHook));
        console.log("LendingHook allowlisted in StreamingContract");

        vm.stopBroadcast();

        // Save deployment addresses to a file
        string memory deploymentInfo = string(
            abi.encodePacked(
                "STREAMING_CONTRACT=", vm.toString(address(streamingContract)), "\n",
                "LENDING_HOOK=", vm.toString(address(lendingHook)), "\n",
                "NETWORK_SLA=", vm.toString(address(networkSLA)), "\n",
                "MOCK_ORACLE=", vm.toString(address(oracle)), "\n"
            )
        );
        
        vm.writeFile("deployment-addresses.env", deploymentInfo);
        console.log("Deployment addresses saved to deployment-addresses.env");
    }
}
