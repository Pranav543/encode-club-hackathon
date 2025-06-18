// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "../src/contracts/PerformanceDataGenerator.sol";
import "../src/contracts/NetworkSLAWithStreamRecreation.sol";

contract DeployFullSystemScript is Script {
    function run() external {
        vm.startBroadcast();
        
        // Deploy performance data generator with violation-prone ranges
        PerformanceDataGenerator performanceContract = new PerformanceDataGenerator();
        console.log("PerformanceDataGenerator deployed to:", address(performanceContract));
        
        // Deploy enhanced SLA contract
        NetworkSLAWithStreamRecreation slaContract = new NetworkSLAWithStreamRecreation(address(performanceContract));
        console.log("NetworkSLAWithStreamRecreation deployed to:", address(slaContract));
        
        // Generate initial performance data
        for (uint i = 0; i < 5; i++) {
            performanceContract.generatePerformanceData();
        }
        console.log("Generated initial performance data");
        
        vm.stopBroadcast();
    }
}
