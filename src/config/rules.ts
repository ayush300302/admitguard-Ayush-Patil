export interface ValidationRule {
  type: 'required' | 'minLength' | 'noNumbers' | 'emailFormat' | 'unique' | 'pattern' | 'ageRange' | 'range' | 'minValue' | 'notEquals' | 'exactLength' | 'conditional';
  message?: string;
  value?: any;
  pattern?: string;
  min?: number;
  max?: number;
  checkStorage?: boolean;
  blockSubmission?: boolean;
  bannerMessage?: string;
  conditions?: Array<{
    when: string;
    is?: any;
    in?: any[];
    requires?: string;
    min?: number;
    max?: number;
    message?: string;
  }>;
}

export interface FieldConfig {
  id: string;
  label: string;
  type: 'text' | 'email' | 'tel' | 'date' | 'select' | 'number' | 'toggle';
  category: 'strict' | 'soft';
  options?: string[];
  subType?: 'toggle';
  validations: ValidationRule[];
  allowException: boolean;
  rationaleKeywords?: string[];
  rationaleMinLength?: number;
}

export interface RulesConfig {
  fields: FieldConfig[];
  systemRules: {
    maxExceptions: number;
    flagMessage: string;
  };
}

export const rulesConfig: RulesConfig = {
  fields: [
    {
      id: "fullName",
      label: "Full Name",
      type: "text",
      category: "strict",
      validations: [
        { type: "required", message: "Full name is required" },
        { type: "minLength", value: 2, message: "Name must be at least 2 characters" },
        { type: "noNumbers", message: "Name cannot contain numbers", pattern: "^[^0-9]*$" }
      ],
      allowException: false
    },
    {
      id: "email",
      label: "Email Address",
      type: "email",
      category: "strict",
      validations: [
        { type: "required", message: "Email is required" },
        { type: "emailFormat", message: "Enter a valid email address (e.g., name@company.com)" },
        { type: "unique", message: "This email is already registered", checkStorage: true }
      ],
      allowException: false
    },
    {
      id: "phone",
      label: "Phone Number",
      type: "tel",
      category: "strict",
      validations: [
        { type: "required", message: "Phone number is required" },
        { type: "pattern", pattern: "^[6-9]\\d{9}$", message: "Enter 10-digit Indian mobile number starting with 6-9" }
      ],
      allowException: false
    },
    {
      id: "dob",
      label: "Date of Birth",
      type: "date",
      category: "soft",
      validations: [
        { type: "required", message: "Date of birth is required" },
        { type: "ageRange", min: 18, max: 35, message: "Candidate must be 18-35 years old" }
      ],
      allowException: true,
      rationaleKeywords: ["approved by", "special case", "documentation pending", "waiver granted"],
      rationaleMinLength: 30
    },
    {
      id: "qualification",
      label: "Highest Qualification",
      type: "select",
      options: ["B.Tech", "B.E.", "B.Sc", "BCA", "M.Tech", "M.Sc", "MCA", "MBA"],
      category: "strict",
      validations: [
        { type: "required", message: "Please select a qualification" }
      ],
      allowException: false
    },
    {
      id: "graduationYear",
      label: "Graduation Year",
      type: "number",
      category: "soft",
      validations: [
        { type: "required", message: "Graduation year is required" },
        { type: "range", min: 2015, max: 2025, message: "Graduation year must be between 2015-2025" }
      ],
      allowException: true,
      rationaleKeywords: ["approved by", "special case", "documentation pending", "waiver granted"],
      rationaleMinLength: 30
    },
    {
      id: "scoreValue",
      label: "Percentage / CGPA",
      type: "number",
      category: "soft",
      subType: "toggle",
      validations: [
        { type: "required", message: "Score is required" },
        { 
          type: "conditional", 
          conditions: [
            { when: "scoreType", is: "percentage", min: 60, message: "Percentage must be ≥ 60%" },
            { when: "scoreType", is: "cgpa", min: 6.0, max: 10, message: "CGPA must be ≥ 6.0 on 10-point scale" }
          ]
        }
      ],
      allowException: true,
      rationaleKeywords: ["approved by", "special case", "documentation pending", "waiver granted"],
      rationaleMinLength: 30
    },
    {
      id: "screeningScore",
      label: "Screening Test Score",
      type: "number",
      category: "soft",
      validations: [
        { type: "required", message: "Screening score is required" },
        { type: "range", min: 0, max: 100, message: "Score must be 0-100" },
        { type: "minValue", value: 40, message: "Minimum qualifying score is 40/100" }
      ],
      allowException: true,
      rationaleKeywords: ["approved by", "special case", "documentation pending", "waiver granted"],
      rationaleMinLength: 30
    },
    {
      id: "interviewStatus",
      label: "Interview Status",
      type: "select",
      options: ["Cleared", "Waitlisted", "Rejected"],
      category: "strict",
      validations: [
        { type: "required", message: "Interview status is required" },
        { type: "notEquals", value: "Rejected", blockSubmission: true, bannerMessage: "Rejected candidates cannot be enrolled" }
      ],
      allowException: false
    },
    {
      id: "aadhaar",
      label: "Aadhaar Number",
      type: "text",
      category: "strict",
      validations: [
        { type: "required", message: "Aadhaar number is required" },
        { type: "exactLength", value: 12, message: "Aadhaar must be exactly 12 digits" },
        { type: "pattern", pattern: "^\\d{12}$", message: "Aadhaar must contain only numbers" }
      ],
      allowException: false
    },
    {
      id: "offerLetterSent",
      label: "Offer Letter Sent",
      type: "toggle",
      category: "strict",
      validations: [
        { 
          type: "conditional", 
          conditions: [
            { when: "offerLetterSent", is: true, requires: "interviewStatus", in: ["Cleared", "Waitlisted"], message: "Offer letter can only be sent if interview is Cleared or Waitlisted" }
          ]
        }
      ],
      allowException: false
    }
  ],
  systemRules: {
    maxExceptions: 2,
    flagMessage: "This candidate has more than 2 exceptions. Entry will be flagged for manager review."
  }
};
