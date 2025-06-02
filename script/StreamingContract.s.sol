// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "../src/StreamingContract.sol";

contract DeployScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        vm.startBroadcast(deployerPrivateKey);

        StreamingContract streamingContract = new StreamingContract(deployer);

        vm.stopBroadcast();

        console.log(
            "StreamingContract deployed to:",
            address(streamingContract)
        );
    }
}
