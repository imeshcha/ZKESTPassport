// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC721 {
    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
    function balanceOf(address owner) external view returns (uint256);
    function ownerOf(uint256 tokenId) external view returns (address);
}

interface IERC5192 {
    event Locked(uint256 tokenId);
    event Unlocked(uint256 tokenId);
    function locked(uint256 tokenId) external view returns (bool);
}

interface IERC165 {
    function supportsInterface(bytes4 interfaceId) external view returns (bool);
}

contract ZKESTPassport is IERC721, IERC5192, IERC165 {
    string public name = "ZKEST Passport";
    string public symbol = "ZKPSP";

    uint256 private _nextTokenId;

    struct PassportMetadata {
        string passportId;
        string zkProofHash;
        uint256 grandTotalUSD;
        uint256 mintedAt;
    }

    mapping(uint256 => address) private _owners;
    mapping(address => uint256) public walletToTokenId;
    mapping(uint256 => PassportMetadata) public passportData;

    event Minted(address indexed owner, uint256 indexed tokenId, string passportId);
    event PassportUpdated(uint256 indexed tokenId, string newZkProofHash, uint256 newGrandTotalUSD);

    modifier notAlreadyMinted() {
        require(walletToTokenId[msg.sender] == 0, "ZKEST: Already minted for this wallet");
        _;
    }

    function mint(string calldata passportId, string calldata zkProofHash, uint256 grandTotalUSD) external notAlreadyMinted {
        _nextTokenId++;
        uint256 tokenId = _nextTokenId;

        _owners[tokenId] = msg.sender;
        walletToTokenId[msg.sender] = tokenId;

        passportData[tokenId] = PassportMetadata({
            passportId: passportId,
            zkProofHash: zkProofHash,
            grandTotalUSD: grandTotalUSD,
            mintedAt: block.timestamp
        });

        emit Transfer(address(0), msg.sender, tokenId);
        emit Locked(tokenId);
        emit Minted(msg.sender, tokenId, passportId);
    }

    function updatePassport(string calldata newZkProofHash, uint256 newGrandTotalUSD) external {
        uint256 tokenId = walletToTokenId[msg.sender];
        require(tokenId != 0, "ZKEST: No passport minted for this wallet");

        passportData[tokenId].zkProofHash = newZkProofHash;
        passportData[tokenId].grandTotalUSD = newGrandTotalUSD;
        passportData[tokenId].mintedAt = block.timestamp;

        emit PassportUpdated(tokenId, newZkProofHash, newGrandTotalUSD);
    }

    function locked(uint256) external pure override returns (bool) { return true; }
    
    function ownerOf(uint256 tokenId) external view override returns (address) {
        address owner = _owners[tokenId];
        require(owner != address(0), "ZKEST: Token does not exist");
        return owner;
    }
    function balanceOf(address owner) external view override returns (uint256) {
        return walletToTokenId[owner] > 0 ? 1 : 0;
    }
    function totalSupply() external view returns (uint256) { return _nextTokenId; }
    function transferFrom(address, address, uint256) external pure { revert("ZKEST: SBT is non-transferable"); }
    function approve(address, uint256) external pure { revert("ZKEST: SBT is non-transferable"); }
    function setApprovalForAll(address, bool) external pure { revert("ZKEST: SBT is non-transferable"); }
    function supportsInterface(bytes4 interfaceId) external pure override returns (bool) {
        return interfaceId == type(IERC721).interfaceId || interfaceId == type(IERC5192).interfaceId || interfaceId == type(IERC165).interfaceId;
    }
}
