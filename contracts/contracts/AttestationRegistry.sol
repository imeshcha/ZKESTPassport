// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./WealthPassport.sol";

contract AttestationRegistry is Ownable {
    WealthPassport public wealthPassport;

    enum AttestationStatus { PENDING, CURRENT, EXPIRED, REJECTED, REVOKED }

    struct Attestation {
        uint256 passportId;
        string assetCategory;
        string documentHash;
        uint256 timestamp;
        AttestationStatus status;
        address verifier;
    }

    mapping(bytes32 => Attestation) public attestations;
    mapping(uint256 => bytes32[]) public passportToAttestations;

    event AttestationCreated(bytes32 indexed attestationId, uint256 indexed passportId, string assetCategory);
    event AttestationUpdated(bytes32 indexed attestationId, AttestationStatus status);

    constructor(address _wealthPassportAddress) Ownable(msg.sender) {
        wealthPassport = WealthPassport(_wealthPassportAddress);
    }

    function createAttestation(
        uint256 passportId,
        string memory assetCategory,
        string memory documentHash
    ) external returns (bytes32) {
        // Can be restricted to authorized verifiers
        
        bytes32 attestationId = keccak256(
            abi.encodePacked(passportId, assetCategory, documentHash, block.timestamp)
        );

        attestations[attestationId] = Attestation({
            passportId: passportId,
            assetCategory: assetCategory,
            documentHash: documentHash,
            timestamp: block.timestamp,
            status: AttestationStatus.CURRENT,
            verifier: msg.sender
        });

        passportToAttestations[passportId].push(attestationId);

        emit AttestationCreated(attestationId, passportId, assetCategory);
        return attestationId;
    }

    function updateAttestationStatus(bytes32 attestationId, AttestationStatus newStatus) external {
        // In a real MVP, restrict this to the original verifier or admin
        require(attestations[attestationId].timestamp != 0, "Attestation does not exist");
        
        attestations[attestationId].status = newStatus;
        emit AttestationUpdated(attestationId, newStatus);
    }

    function getPassportAttestations(uint256 passportId) external view returns (bytes32[] memory) {
        return passportToAttestations[passportId];
    }
}
