const { findDepartmentByName } = require('../scripts/process_departments_spend.js');

describe('Department Matching Tests', () => {
  // Mock departments data
  const mockDepartments = [
    {
      name: "Air Resources Board",
      canonicalName: "Air Resources Board",
      aliases: ["CARB", "air board", "California Air Resources Board"],
      budgetCode: "3900",
      orgLevel: 2,
      active: true
    },
    {
      name: "Department of Motor Vehicles",
      canonicalName: "Department of Motor Vehicles",
      aliases: ["DMV", "Motor Vehicles"],
      budgetCode: "2740",
      orgLevel: 2,
      active: true
    },
    {
      name: "California State University, Sacramento",
      canonicalName: "Sacramento State",
      aliases: ["CSUS", "Sac State"],
      budgetCode: null,
      orgLevel: 2,
      active: true
    }
  ];

  // Mock logger that does nothing
  const mockLog = () => {};

  test('should match California Air Resources Board exactly', () => {
    const result = findDepartmentByName("California Air Resources Board", mockDepartments, mockLog, "3900");
    expect(result).not.toBeNull();
    expect(result.department.name).toBe("Air Resources Board");
    expect(result.isPartialMatch).toBe(false);
  });

  test('should match CARB as an alias', () => {
    const result = findDepartmentByName("CARB", mockDepartments, mockLog, "3900");
    expect(result).not.toBeNull();
    expect(result.department.name).toBe("Air Resources Board");
    expect(result.isPartialMatch).toBe(false);
  });

  test('should match with budget code even with slight name mismatch', () => {
    const result = findDepartmentByName("Cal Air Resources Board", mockDepartments, mockLog, "3900");
    expect(result).not.toBeNull();
    expect(result.department.name).toBe("Air Resources Board");
  });

  test('should match DMV with canonical name', () => {
    const result = findDepartmentByName("Department of Motor Vehicles", mockDepartments, mockLog, "2740");
    expect(result).not.toBeNull();
    expect(result.department.name).toBe("Department of Motor Vehicles");
    expect(result.isPartialMatch).toBe(false);
  });

  test('should match Sacramento State with variations', () => {
    const result = findDepartmentByName("CSU Sacramento", mockDepartments, mockLog);
    expect(result).not.toBeNull();
    expect(result.department.name).toBe("California State University, Sacramento");
  });

  test('should not match non-existent department', () => {
    const result = findDepartmentByName("Department of Non Existent", mockDepartments, mockLog);
    expect(result).toBeNull();
  });

  test('should not match level 1 departments', () => {
    const departmentsWithLevel1 = [
      ...mockDepartments,
      {
        name: "Level 1 Department",
        canonicalName: "Level 1 Department",
        aliases: [],
        budgetCode: "1234",
        orgLevel: 1,
        active: true
      }
    ];
    const result = findDepartmentByName("Level 1 Department", departmentsWithLevel1, mockLog, "1234");
    expect(result).toBeNull();
  });
}); 