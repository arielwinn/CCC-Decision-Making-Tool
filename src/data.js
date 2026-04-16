export const EPAS = [
  { id: 1, name: 'Providing Preventative Primary Care for Children of All Ages', short: 'Preventative Primary Care' },
  { id: 2, name: 'Providing Comprehensive Primary Care for Children With Complex, Chronic, or Special Health Care Needs', short: 'Complex/Chronic Primary Care' },
  { id: 3, name: 'Managing Patients With Common Acute Diagnoses', short: 'Common Acute Diagnoses' },
  { id: 4, name: 'Assessing and Managing Patients With Common Behavior and Mental Health Concerns', short: 'Behavior & Mental Health' },
  { id: 5, name: 'Caring for the Newborn Prior to Discharge', short: 'Newborn Care' },
  { id: 6, name: 'Recognizing a Patient Who Requires Subspecialty Medical or Surgical Care, Providing Initial Management, and Seeking Referral or Consultation', short: 'Subspecialty Referral' },
  { id: 7, name: 'Recognizing a Severely Ill Patient, Providing Initial Management, and Mobilizing Resources Needed for Continued Care', short: 'Severely Ill Patient' },
  { id: 8, name: 'Executing Clinical Handovers Within or Across Settings', short: 'Clinical Handovers' },
  { id: 9, name: 'Performing the Common Procedures of the General Pediatrician', short: 'Common Procedures' },
  { id: 10, name: 'Leading Interprofessional Teams to Provide Collaborative, Family-Centered Care', short: 'Interprofessional Teams' },
  { id: 11, name: 'Promoting Equitable Care at the Level of Each Individual Patient and the Population to Address Racism and Other Contributors to Health Inequities', short: 'Equitable Care' },
  { id: 12, name: 'Utilizing Technology and Information Sources to Enhance Learning and Patient Care', short: 'Technology & Information' },
];

export const LEVELS = [
  { key: '1', label: '1', title: 'Observation only (supervisor performs)', color: '#d7263d', desc: 'For level 1, the supervisor is required to perform the activity (or the key portions of the activity). The trainee is NOT ready to actively participate, even with direct supervision.' },
  { key: '2A', label: '2A', title: 'Performs as a coactivity with a supervisor', color: '#e85d04', desc: 'For level 2, a supervisor is required to be present for the activity (or the key portions of the activity).' },
  { key: '2B', label: '2B', title: 'Performs with a supervisor in the room and ready to step in as needed', color: '#f48c06', desc: 'For level 2, a supervisor is required to be present for the activity (or the key portions of the activity).' },
  { key: '3A', label: '3A', title: 'Performs with close support and oversight*', color: '#f2c200', desc: 'For level 3, a supervisor does not always need to be physically present with the trainee while the trainee performs the activity but is required to be readily available to provide immediate support in a manner appropriate to the EPA.*' },
  { key: '3B', label: '3B', title: 'Performs with moderate support and oversight*', color: '#ffd93d', desc: 'For level 3, a supervisor does not always need to be physically present with the trainee while the trainee performs the activity but is required to be readily available to provide immediate support in a manner appropriate to the EPA.*' },
  { key: '4', label: '4', title: 'Performs with limited support and oversight*', color: '#aed15a', desc: 'For level 4, a supervisor is still required to ensure that the activity is done correctly and safely (therefore, the trainee is NOT YET ready for graduation, certification eligibility, or unsupervised practice), but the supervisor does NOT need to be readily available.*' },
  { key: '5', label: '5', title: 'Practice Ready: Performs without supervision', color: '#4caf50', desc: 'For level 5, a supervisor is no longer required to ensure that the activity is done effectively and safely. Therefore, as it relates to this activity, the trainee is ready for graduation, certification eligibility, and unsupervised practice. While the trainee can routinely perform this activity without assistance, they also know their limits and, in those instances, seek input from colleagues. Even at this level, as is true for all pediatricians, the trainee will benefit from continued learning and growth.' },
];

export const FOOTNOTE = [
  'Pertinent information related to levels 3A, 3B, and 4:',
  'While Levels 1, 2, and 5 include prescriptive descriptions, the scale is intentionally less prescriptive for Levels 3A, 3B, and 4 to ensure applicability across all General Pediatrics and subspecialty EPAs, as specific components of supervision vary in relevance based on EPA-specific characteristics, including patient acuity and scope.',
  'Levels 3A, 3B, and 4 incorporate two related constructs: (1) supervisor availability (how readily available the supervisor needs to be) and (2) degree of support/oversight (how much guidance and intervention the trainee needs). While these typically align, in rare cases where they diverge, assign the lower level (more supervision required).',
];

export const framingQuestion = (epaName) =>
  `If practicing as a General Pediatrician (without supervision requirements or limitations on available supervision), what level of supervision does the clinical competency committee believe this trainee would require when ${epaName} to ensure safe and effective care?`;
