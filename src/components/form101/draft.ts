import { Form101Data, form101Schema } from '@/lib/form101/schema';

// The wizard's working copy: like Form101Data, but choices start unselected and the declaration unconfirmed
type Employee = Form101Data['employee'];
export type Form101Draft = Omit<Form101Data, 'employee' | 'declaration'> & {
  employee: Omit<Employee, 'gender' | 'maritalStatus'> & {
    gender: Employee['gender'] | '';
    maritalStatus: Employee['maritalStatus'] | '';
  };
  declaration: { accepted: boolean; date: string };
};

export const todayIso = () => new Date().toISOString().slice(0, 10);

export function emptyDraft(taxYear: number): Form101Draft {
  return {
    taxYear,
    employee: {
      hasIsraeliId: true,
      idNumber: '',
      passportNumber: '',
      lastName: '',
      firstName: '',
      birthDate: '',
      aliyaDate: '',
      street: '',
      houseNumber: '',
      city: '',
      zip: '',
      phone: '',
      mobile: '',
      email: '',
      gender: '',
      maritalStatus: '',
      israeliResident: true,
      kibbutz: 'no',
      healthFund: { member: null, name: '' },
    },
    children: [],
    income: { type: 'monthly', startDate: '' },
    otherIncome: { has: false, types: [], creditPoints: null, noStudyFund: false, noPension: false },
    spouse: null,
    changes: [],
    reliefs: {
      disabled: false,
      disabledAllowance: false,
      settlement: null,
      newImmigrant: null,
      spouseNoIncome: false,
      singleParentFamily: false,
      childrenInCustody: null,
      childrenOther: null,
      singleParent: false,
      childrenNotInCustody: false,
      disabledChildren: null,
      alimony: false,
      age16to18: false,
      dischargedSoldier: null,
      academicDegree: false,
      reserveCombatDays: null,
    },
    taxCoordination: { reason: 'none', otherIncomes: [] },
    declaration: { accepted: false, date: todayIso() },
    signature: '',
  };
}

// Drops answers that don't apply anymore (e.g. children after switching to "no Israeli ID")
export function toSubmission(draft: Form101Draft) {
  const { employee } = draft;
  return {
    ...draft,
    employee: {
      ...employee,
      idNumber: employee.hasIsraeliId ? employee.idNumber : '',
      passportNumber: employee.hasIsraeliId ? '' : employee.passportNumber,
      aliyaDate: employee.hasIsraeliId ? employee.aliyaDate : '',
      healthFund: { ...employee.healthFund, name: employee.healthFund.member ? employee.healthFund.name : '' },
    },
    children: employee.hasIsraeliId ? draft.children : [],
    spouse: employee.maritalStatus === 'married' ? draft.spouse : null,
    otherIncome: draft.otherIncome.has
      ? draft.otherIncome
      : { has: false, types: [], creditPoints: null, noStudyFund: false, noPension: false },
    taxCoordination:
      draft.taxCoordination.reason === 'other-incomes' ? draft.taxCoordination : { ...draft.taxCoordination, otherIncomes: [] },
  };
}

// Which top-level sections each wizard step is responsible for
export const STEP_SECTIONS: string[][] = [
  [],
  ['employee'],
  ['income', 'otherIncome'],
  ['children', 'spouse'],
  ['reliefs', 'taxCoordination', 'changes'],
  ['declaration', 'signature'],
];

// Validation errors keyed by field path ("employee.idNumber"), limited to the given sections
export function validateSections(draft: Form101Draft, sections: string[]) {
  const result = form101Schema.safeParse(toSubmission(draft));
  const errors: Record<string, string> = {};
  if (result.success) return errors;
  for (const issue of result.error.issues) {
    const path = issue.path.join('.');
    if (sections.includes(String(issue.path[0])) && !errors[path]) errors[path] = issue.message;
  }
  return errors;
}
