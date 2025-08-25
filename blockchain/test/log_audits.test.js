const LogAudits = artifacts.require("LogAudits");

// Start a test suite for the LogAudits contract
contract("LogAudits", (accounts) => {
  // Declare variables to be used across tests
  let logAuditsInstance;

  // Define accounts for different roles to make tests more readable
  const [owner, patient, doctor, labStaff] = accounts;

  // This hook runs before each 'it' block, deploying a fresh contract instance.
  // This ensures that tests are isolated from each other.
  beforeEach(async () => {
    logAuditsInstance = await LogAudits.new({ from: owner });
  });

  // Test Case 1: Contract Deployment
  it("should deploy the contract successfully", async () => {
    assert.ok(logAuditsInstance.address, "Contract should have an address");
  });

  // Test Case 2: submitSymptom function
  describe("submitSymptom", () => {
    it("should allow a patient to submit symptoms and emit a PatientLogged event", async () => {
      // Perform the transaction
      const tx = await logAuditsInstance.submitSymptom(true, false, true, "patient", { from: patient });

      // Check that exactly one event was emitted
      assert.equal(tx.logs.length, 1, "Should emit one event");

      const log = tx.logs[0];
      // Check the event name
      assert.equal(log.event, "PatientLogged", "The event name should be PatientLogged");

      // Check the arguments of the event
      const args = log.args;
      assert.equal(args.user, patient, "The event user should be the patient's address");
      assert.equal(args.role, "patient", "The event role should be 'patient'");
      assert.equal(args.action_type, "submit_symptom", "The action type should be 'submit_symptom'");
      assert.ok(args.created_at, "The timestamp should exist");

      // Check the nested consent struct within the event
      const consent = args.granted_consent;
      assert.equal(consent.treatment, true, "Treatment consent should be true");
      assert.equal(consent.referral, false, "Referral consent should be false");
      assert.equal(consent.research, true, "Research consent should be true");
    });
  });

  // A helper function to test all ActionLogged events to avoid repeating code
  const testActionLoggedEvent = async (functionName, role, userAccount, actionType) => {
    const tx = await logAuditsInstance[functionName](role, { from: userAccount });
    
    assert.equal(tx.logs.length, 1, "Should emit one event");
    const log = tx.logs[0];
    assert.equal(log.event, "ActionLogged", "The event name should be ActionLogged");

    const args = log.args;
    assert.equal(args.user, userAccount, `The user should be the ${role}'s address`);
    assert.equal(args.role, role, `The role should be '${role}'`);
    assert.equal(args.action_type, actionType, `The action type should be '${actionType}'`);
    assert.ok(args.created_at, "The timestamp should exist");
  };

  // Test Case 3: addDiagnosis function
  it("should log an 'add_diagnosis' action for a doctor", async () => {
    await testActionLoggedEvent("addDiagnosis", "doctor", doctor, "add_diagnosis");
  });

  // Test Case 4: referToDoctor function
  it("should log a 'refer_to_doctor' action for a doctor", async () => {
    await testActionLoggedEvent("referToDoctor", "doctor", doctor, "refer_to_doctor");
  });

  // Test Case 5: assignTest function
  it("should log an 'assign_test' action for a doctor", async () => {
    await testActionLoggedEvent("assignTest", "doctor", doctor, "assign_test");
  });

  // Test Case 6: updateTestResults function
  it("should log an 'update_test_results' action for lab staff", async () => {
    await testActionLoggedEvent("updateTestResults", "lab_staff", labStaff, "update_test_results");
  });
});