// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract LogAudits {

    // Struct for Symptom
    struct Symptom {
        string symptomDescription;
        uint256 submittedAt;
        address patient; // The patient who submitted the symptom
        bool treatmentConsent;
        bool referralConsent;
        bool researchConsent;
    }

    // Mapping to store symptoms by patient address
    mapping(address => Symptom[]) public patientSymptoms;

    // Event to log symptom submission
    event SymptomSubmitted(
        address indexed patient,
        string symptomDescription,
        uint256 timestamp,
        bool treatmentConsent,
        bool referralConsent,
        bool researchConsent
    );

    // Modifier to check if the sender is the patient (can only submit their own symptoms)
    modifier onlyPatient(address patient) {
        require(msg.sender == patient, "Only the patient can submit their symptoms.");
        _;
    }

    // Function for Patient to submit Symptom
    function submitSymptom(
        string memory _symptomDescription,
        bool _treatmentConsent,
        bool _referralConsent,
        bool _researchConsent
    ) public onlyPatient(msg.sender) {
        // Generate a new symptom
        Symptom memory newSymptom = Symptom({
            symptomDescription: _symptomDescription,
            submittedAt: block.timestamp,
            patient: msg.sender,
            treatmentConsent: _treatmentConsent,
            referralConsent: _referralConsent,
            researchConsent: _researchConsent
        });

        // Store the symptom in the mapping
        patientSymptoms[msg.sender].push(newSymptom);

        // Emit an event for the symptom submission
        emit SymptomSubmitted(
            msg.sender,
            _symptomDescription,
            block.timestamp,
            _treatmentConsent,
            _referralConsent,
            _researchConsent
        );
    }

    // Function to view symptoms (Only authorized doctors or admins can view)
    function viewSymptom(address _patient, uint256 _symptomIndex) public view returns (
        string memory symptomDescription,
        uint256 submittedAt,
        bool treatmentConsent,
        bool referralConsent,
        bool researchConsent
    ) {
        // Fetch the symptom from the mapping
        Symptom memory symptom = patientSymptoms[_patient][_symptomIndex];
        
        return (
            symptom.symptomDescription,
            symptom.submittedAt,
            symptom.treatmentConsent,
            symptom.referralConsent,
            symptom.researchConsent
        );
    }
}
