// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract WealthPassport is ERC721, Ownable {
    uint256 private _nextTokenId;

    mapping(address => bool) public hasPassport;
    mapping(address => uint256) public userToPassportId;

    event PassportMinted(address indexed owner, uint256 indexed passportId);

    constructor() ERC721("ZKEST Wealth Passport", "ZKWP") Ownable(msg.sender) {}

    function mintPassport() external {
        require(!hasPassport[msg.sender], "User already has a Wealth Passport");

        uint256 tokenId = _nextTokenId++;
        _safeMint(msg.sender, tokenId);

        hasPassport[msg.sender] = true;
        userToPassportId[msg.sender] = tokenId;

        emit PassportMinted(msg.sender, tokenId);
    }
}
