// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract LogAudits {
    // Define the struct for consent information
    struct Consent {
        bool treatment;
        bool referral;
        bool research;
    }

    // Mapping to store consent data for each user (address)
    mapping(address => Consent) private userConsent;
    // Mapping to store authorized addresses (providers can be doctors, lab staff, etc.)
    mapping(address => bool) private authorizedProviders;

    // Define the structure of the event
    event PatientLogged(
        address indexed user,            // The user performing the action
        string role,                     // Role of the user (e.g., patient, doctor, lab staff)
        string action_type,              // The type of action (e.g., submit_symptom, add_diagnosis)
        uint256 created_at,              // Timestamp of the action
        Consent granted_consent          // Consent for the action (only used in submit_symptom)
    );

    event ActionLogged(
        address indexed user,            // The user performing the action
        string role,                     // Role of the user (e.g., patient, doctor, lab staff)
        string action_type,              // The type of action (e.g., submit_symptom, add_diagnosis)
        uint256 created_at
    );


    // Function to submit a symptom with consent (only for patients)
    function submitSymptom(
        bool _treatmentConsent,
        bool _referralConsent,
        bool _researchConsent,
        string memory _role
    ) public {
        // Store the consent information in the mapping
        userConsent[msg.sender] = Consent({
            treatment: _treatmentConsent,
            referral: _referralConsent,
            research: _researchConsent
        });

        // Emit the event logging the action and consent
        emit PatientLogged(
            msg.sender,
            _role,                          // Role passed as a parameter
            "submit_symptom",               // Action type: submit_symptom
            block.timestamp,                // Timestamp of the action
            userConsent[msg.sender]         // The consent granted
        );
    }

    // Function for a doctor to add a diagnosis (requires a valid doctor role)
    function addDiagnosis(string memory _role) public {
        emit ActionLogged(
            msg.sender, 
            _role, 
            "add_diagnosis", 
            block.timestamp
            );
    }

    // Function for referring a patient to another doctor (requires a valid doctor role)
    function referToDoctor(string memory _role) public {
        emit ActionLogged(
            msg.sender,
            _role, 
            "refer_to_doctor", 
            block.timestamp);
    }

    // Function for assigning a test to the lab (requires a valid doctor role)
    function assignTest(string memory _role) public {
        emit ActionLogged(
            msg.sender, 
            _role, 
            "assign_test", 
            block.timestamp);
    }

    // Function for lab staff to update test results (requires a valid lab staff role)
    function updateTestResults(string memory _role) public {
        emit ActionLogged(
            msg.sender, 
            _role, 
            "update_test_results", 
            block.timestamp);
    }
}