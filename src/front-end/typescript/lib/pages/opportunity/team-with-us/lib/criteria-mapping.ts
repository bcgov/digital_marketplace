// Team With Us Criteria Mapping and Citation Utilities

export interface CriteriaMapping {
  name: string;
  supportingDocuments: Array<{
    name: string;
    description: string;
  }>;
  keyContentAreas: string[];
}

export interface DocumentMapping {
  name: string;
  authority: string;
  scope: string;
  supportsCriteria: string[];
  keyContributions: string[];
  url?: string; // Add URL field for document links
}

// Document URL mappings - maps document names to their content URLs
export const DOCUMENT_URLS: Record<string, string> = {
  "Team With Us Ministry Guide": "/content/team-with-us-opportunity-guide",
  "Team With Us Proposal Guide": "/content/team-with-us-proposal-guide",
  "CPPM Chapter 6 Procurement Policy": "https://www2.gov.bc.ca/assets/gov/government/services-for-government/bc-buy/goods-and-services/cppm/cppm_chapter_6_procurement_policy.pdf",
  "Procurement Practice Standard": "https://www2.gov.bc.ca/assets/gov/government/services-for-government/bc-buy/goods-and-services/cppm/procurement_practice_standard.pdf",
  "Agile Software Development Agreement": "/content/agile-software-development-agreement",
  "Multi-Resource Agreement": "/content/multi-resource-agreement",
  "DO-2024-1 Team With Us RFQ": "/content/do-2024-1-team-with-us-rfq",
  "Sprint With Us RFQ": "/content/sprint-with-us-rfq"
};

// Criteria to Document Mapping
export const CRITERIA_MAPPINGS: Record<string, CriteriaMapping> = {
  "organization-legal": {
    name: "Organization & Legal Requirements",
    supportingDocuments: [
      {
        name: "CPPM Chapter 6 Procurement Policy",
        description: "Core legal framework, accountability requirements, ministry responsibilities"
      },
      {
        name: "Team With Us Ministry Guide",
        description: "Ministry-specific requirements, eligibility criteria, organizational context"
      },
      {
        name: "Procurement Practice Standard",
        description: "Operational guidance for organizational compliance"
      }
    ],
    keyContentAreas: [
      "Legal requirements for purchasing organization identification",
      "Ministry accountability and delegation requirements",
      "Organizational background and context requirements",
      "Procurement authorization and approval processes"
    ]
  },
  "contract-outcomes": {
    name: "Contract Outcomes & Responsibilities",
    supportingDocuments: [
      {
        name: "Team With Us Ministry Guide",
        description: "Service area definitions, role responsibilities, outcomes framework"
      },
      {
        name: "Agile Software Development Agreement",
        description: "Contract structure, deliverables, performance measures"
      },
      {
        name: "Multi-Resource Agreement",
        description: "Alternative contract model, resource management, outcomes tracking"
      }
    ],
    keyContentAreas: [
      "Service area definitions (Full Stack Developer, Agile Coach, DevOps Specialist, Data Professional, Service Designer)",
      "Contract deliverables and performance measures",
      "Role responsibilities and task alignment",
      "Outcome measurement and success criteria"
    ]
  },
  "mandatory-skills": {
    name: "Mandatory Skills & Requirements",
    supportingDocuments: [
      {
        name: "Team With Us Ministry Guide",
        description: "Service area skill requirements, capability definitions"
      },
      {
        name: "DO-2024-1 Team With Us RFQ",
        description: "Qualification standards, evaluation criteria, minimum requirements"
      },
      {
        name: "Procurement Practice Standard",
        description: "Skills evaluation best practices, assessment methodologies"
      }
    ],
    keyContentAreas: [
      "Minimum skill requirements for each service area",
      "Qualification evaluation criteria and standards",
      "Skills assessment and validation processes",
      "Experience requirements and measurement standards"
    ]
  },
  "timeline-planning": {
    name: "Procurement Timeline & Planning",
    supportingDocuments: [
      {
        name: "Team With Us Ministry Guide",
        description: "10-day minimum posting period, evaluation timelines, process stages"
      },
      {
        name: "CPPM Chapter 6 Procurement Policy",
        description: "Trade agreement requirements, competitive process thresholds"
      },
      {
        name: "Procurement Practice Standard",
        description: "Timeline planning guidance, evaluation scheduling"
      }
    ],
    keyContentAreas: [
      "Minimum posting periods and requirements",
      "Evaluation timeline recommendations",
      "Skills challenge scheduling requirements",
      "Trade agreement compliance timelines"
    ]
  },
  "budget-financial": {
    name: "Budget Guidance & Financial Planning",
    supportingDocuments: [
      {
        name: "Team With Us Ministry Guide",
        description: "20-25k/month standard for full-time resources, budget transparency"
      },
      {
        name: "CPPM Chapter 6 Procurement Policy",
        description: "Financial accountability, appropriation requirements, cost management"
      },
      {
        name: "Agile Software Development Agreement",
        description: "Payment structures, fee schedules, financial terms"
      }
    ],
    keyContentAreas: [
      "Standard hourly rates and monthly costs",
      "Budget calculation methodologies",
      "Financial accountability and transparency requirements",
      "Payment structures and terms"
    ]
  },
  "contract-extensions": {
    name: "Contract Extensions & Legal Language",
    supportingDocuments: [
      {
        name: "Team With Us Ministry Guide",
        description: "Contract extension capabilities, time and materials model"
      },
      {
        name: "Agile Software Development Agreement",
        description: "Legal language for extensions, termination clauses"
      },
      {
        name: "Multi-Resource Agreement",
        description: "Alternative extension provisions, renewal terms"
      }
    ],
    keyContentAreas: [
      "Contract extension mechanisms and authorization",
      "Legal language requirements for extensions",
      "Termination and renewal provisions",
      "Time and materials contract structure"
    ]
  },
  "information-gaps": {
    name: "Key Information Gaps",
    supportingDocuments: [
      {
        name: "Team With Us Ministry Guide",
        description: "Complete opportunity requirements, mandatory elements"
      },
      {
        name: "DO-2024-1 Team With Us RFQ",
        description: "Qualification and submission requirements, evaluation criteria"
      },
      {
        name: "Sprint With Us RFQ",
        description: "Comparison model for completeness and best practices"
      }
    ],
    keyContentAreas: [
      "Mandatory information requirements",
      "Opportunity completeness standards",
      "Qualification and submission requirements",
      "Best practice examples and comparisons"
    ]
  },
  "vendor-experience": {
    name: "Vendor Experience Issues",
    supportingDocuments: [
      {
        name: "Team With Us Ministry Guide",
        description: "Vendor guidance, expectations, process clarity"
      },
      {
        name: "Procurement Practice Standard",
        description: "Vendor communication best practices, transparency requirements"
      },
      {
        name: "DO-2024-1 Team With Us RFQ",
        description: "Vendor qualification process, submission requirements"
      }
    ],
    keyContentAreas: [
      "Vendor communication and guidance standards",
      "Transparency and clarity requirements",
      "Qualification and submission process optimization",
      "Best practices for vendor engagement"
    ]
  }
};

// Document to Criteria Mapping
export const DOCUMENT_MAPPINGS: Record<string, DocumentMapping> = {
  "cppm-chapter-6": {
    name: "CPPM Chapter 6 Procurement Policy",
    authority: "Office of the Comptroller General",
    scope: "Foundational procurement policy for BC Government",
    supportsCriteria: [
      "Organization & Legal Requirements",
      "Procurement Timeline & Planning", 
      "Budget Guidance & Financial Planning"
    ],
    keyContributions: [
      "Establishes procurement principles (accountability, transparency, competition)",
      "Defines ministry responsibilities and delegation requirements",
      "Sets competitive process thresholds and trade agreement compliance",
      "Provides financial accountability framework"
    ],
    url: "https://www2.gov.bc.ca/assets/gov/government/services-for-government/bc-buy/goods-and-services/cppm/cppm_chapter_6_procurement_policy.pdf"
  },
  "team-with-us-guide": {
    name: "Team With Us Ministry Guide",
    authority: "BC Digital Marketplace",
    scope: "Ministry guidance for Team With Us procurement",
    supportsCriteria: [
      "Organization & Legal Requirements",
      "Contract Outcomes & Responsibilities",
      "Mandatory Skills & Requirements",
      "Procurement Timeline & Planning",
      "Budget Guidance & Financial Planning",
      "Contract Extensions & Legal Language",
      "Key Information Gaps",
      "Vendor Experience Issues"
    ],
    keyContributions: [
      "Defines five service areas and their requirements",
      "Establishes 10-day minimum posting period",
      "Sets 20-25k/month standard for full-time resources",
      "Provides complete process guidance for ministries",
      "Explains contract extension capabilities"
    ],
    url: "/content/team-with-us-opportunity-guide"
  },
  "procurement-practice-standard": {
    name: "Procurement Practice Standard",
    authority: "Office of the Comptroller General",
    scope: "Operational guidance for procurement implementation",
    supportsCriteria: [
      "Organization & Legal Requirements",
      "Mandatory Skills & Requirements",
      "Procurement Timeline & Planning",
      "Vendor Experience Issues"
    ],
    keyContributions: [
      "Provides operational guidance for policy implementation",
      "Establishes best practices for skills evaluation",
      "Offers timeline planning and scheduling guidance",
      "Sets vendor communication and transparency standards"
    ],
    url: "https://www2.gov.bc.ca/assets/gov/government/services-for-government/bc-buy/goods-and-services/cppm/procurement_practice_standard.pdf"
  },
  "do-2024-1-rfq": {
    name: "DO-2024-1 Team With Us RFQ",
    authority: "Ministry of Citizens' Services",
    scope: "Vendor qualification requirements for Team With Us",
    supportsCriteria: [
      "Mandatory Skills & Requirements",
      "Key Information Gaps",
      "Vendor Experience Issues"
    ],
    keyContributions: [
      "Establishes qualification standards for each service area",
      "Defines evaluation criteria and minimum requirements",
      "Provides vendor submission requirements and process",
      "Sets reference check and evaluation procedures"
    ],
    url: "/content/do-2024-1-team-with-us-rfq"
  },
  "agile-agreement": {
    name: "Agile Software Development Agreement",
    authority: "Legal Services Branch",
    scope: "Contract template for agile development services",
    supportsCriteria: [
      "Contract Outcomes & Responsibilities",
      "Budget Guidance & Financial Planning",
      "Contract Extensions & Legal Language"
    ],
    keyContributions: [
      "Provides comprehensive contract structure",
      "Establishes payment terms and fee schedules",
      "Defines deliverables and performance measures",
      "Includes termination and extension provisions"
    ],
    url: "/content/agile-software-development-agreement"
  },
  "multi-resource-agreement": {
    name: "Multi-Resource Agreement",
    authority: "Legal Services Branch",
    scope: "Alternative contract template for multiple resource engagement",
    supportsCriteria: [
      "Contract Outcomes & Responsibilities",
      "Contract Extensions & Legal Language"
    ],
    keyContributions: [
      "Offers alternative contract structure for multiple resources",
      "Provides different approach to resource management",
      "Includes alternative extension and renewal mechanisms"
    ],
    url: "/content/multi-resource-agreement"
  },
  "sprint-with-us-rfq": {
    name: "Sprint With Us RFQ",
    authority: "BC Digital Marketplace",
    scope: "Comparison model for opportunity completeness",
    supportsCriteria: [
      "Key Information Gaps"
    ],
    keyContributions: [
      "Provides comparison model for opportunity structure",
      "Demonstrates best practices for opportunity completeness",
      "Offers examples of effective vendor communication"
    ],
    url: "/content/sprint-with-us-rfq"
  }
};

// Keywords for detecting criteria-related questions
const CRITERIA_KEYWORDS = [
  "criteria", "requirements", "evaluation", "assessment", "review",
  "organization", "legal", "contract", "outcomes", "responsibilities",
  "skills", "mandatory", "timeline", "planning", "budget", "financial",
  "extensions", "gaps", "information", "vendor", "experience",
  "documents", "reference", "citation", "policy", "guide", "standard",
  "authority", "compliance", "framework"
];

const SPECIFIC_TOPICS = [
  "posting period", "minimum days", "service areas", "skill requirements",
  "budget calculation", "20k", "25k", "monthly cost", "hourly rate",
  "contract extension", "time and materials", "qualification standards",
  "evaluation criteria", "reference checks", "trade agreements",
  "ministry responsibilities", "procurement principles"
];

/**
 * Detects if a question is related to review criteria or procurement policies
 */
export function isCriteriaRelatedQuestion(question: string): boolean {
  const lowerQuestion = question.toLowerCase();
  
  // Check for criteria keywords
  const hasKeywords = CRITERIA_KEYWORDS.some(keyword => 
    lowerQuestion.includes(keyword)
  );
  
  // Check for specific topics
  const hasSpecificTopics = SPECIFIC_TOPICS.some(topic => 
    lowerQuestion.includes(topic.toLowerCase())
  );
  
  // Check for question patterns about evaluation
  const questionPatterns = [
    /what.*criteria/i,
    /how.*evaluate/i,
    /what.*requirements/i,
    /which.*documents/i,
    /where.*find/i,
    /what.*reference/i,
    /how.*compliant/i,
    /what.*standards/i
  ];
  
  const hasQuestionPatterns = questionPatterns.some(pattern => 
    pattern.test(question)
  );
  
  return hasKeywords || hasSpecificTopics || hasQuestionPatterns;
}

/**
 * Identifies which criteria areas are mentioned in a question
 */
export function identifyRelevantCriteria(question: string): string[] {
  const lowerQuestion = question.toLowerCase();
  const relevantCriteria: string[] = [];
  
  // Check each criteria area for relevant keywords
  Object.entries(CRITERIA_MAPPINGS).forEach(([key, criteria]) => {
    const criteriaName = criteria.name.toLowerCase();
    const criteriaWords = criteriaName.split(/[&\s]+/);
    
    // Check if criteria name or key content areas are mentioned
    const mentioned = criteriaWords.some(word => 
      lowerQuestion.includes(word.toLowerCase())
    ) || criteria.keyContentAreas.some(area => 
      area.toLowerCase().split(' ').some(word => 
        lowerQuestion.includes(word.toLowerCase())
      )
    );
    
    if (mentioned) {
      relevantCriteria.push(key);
    }
  });
  
  // If no specific criteria found but it's criteria-related, return all
  if (relevantCriteria.length === 0 && isCriteriaRelatedQuestion(question)) {
    return Object.keys(CRITERIA_MAPPINGS);
  }
  
  return relevantCriteria;
}

/**
 * Generates citation text for relevant criteria and documents with links
 */
export function generateCitationText(criteriaKeys: string[]): string {
  if (criteriaKeys.length === 0) return "";
  
  const citations: string[] = [];
  const allDocuments = new Set<string>();
  
  criteriaKeys.forEach(key => {
    const criteria = CRITERIA_MAPPINGS[key];
    if (criteria) {
      citations.push(`\n**${criteria.name}:**`);
      criteria.supportingDocuments.forEach(doc => {
        const url = DOCUMENT_URLS[doc.name];
        if (url) {
          citations.push(`- [${doc.name}](${url}) - ${doc.description}`);
        } else {
          citations.push(`- ${doc.name} - ${doc.description}`);
        }
        allDocuments.add(doc.name);
      });
    }
  });
  
  // Add a summary of key documents
  if (allDocuments.size > 0) {
    citations.unshift("\n**📋 Reference Documents:**");
    citations.unshift("Based on the Team With Us procurement documentation:");
  }
  
  return citations.join('\n');
}

/**
 * Gets document authority and scope information
 */
export function getDocumentInfo(documentName: string): DocumentMapping | null {
  const docKey = Object.keys(DOCUMENT_MAPPINGS).find(key => 
    DOCUMENT_MAPPINGS[key].name === documentName
  );
  return docKey ? DOCUMENT_MAPPINGS[docKey] : null;
}

/**
 * Formats a document name as a clickable link if URL is available
 */
export function formatDocumentLink(documentName: string): string {
  const info = getDocumentInfo(documentName);
  const url = info?.url || DOCUMENT_URLS[documentName];
  
  if (url) {
    return `[${documentName}](${url})`;
  }
  return documentName;
}

/**
 * Gets all available documents with their links for reference
 */
export function getAllDocumentsWithLinks(): Array<{name: string, authority: string, url?: string}> {
  return Object.values(DOCUMENT_MAPPINGS).map(doc => ({
    name: doc.name,
    authority: doc.authority,
    url: doc.url
  }));
}

/**
 * Enhanced citation text with document authorities and clickable links
 */
export function generateEnhancedCitationText(criteriaKeys: string[]): string {
  if (criteriaKeys.length === 0) return "";
  
  const citations: string[] = [];
  const documentInfo = new Map<string, DocumentMapping>();
  
  // Collect all relevant documents with their info
  criteriaKeys.forEach(key => {
    const criteria = CRITERIA_MAPPINGS[key];
    if (criteria) {
      criteria.supportingDocuments.forEach(doc => {
        const info = getDocumentInfo(doc.name);
        if (info) {
          documentInfo.set(doc.name, info);
        }
      });
    }
  });
  
  if (documentInfo.size > 0) {
    citations.push("\n**📋 Reference Documents:**");
    documentInfo.forEach((info, docName) => {
      const url = info.url || DOCUMENT_URLS[docName];
      if (url) {
        citations.push(`- **[${docName}](${url})** (${info.authority})`);
        citations.push(`  *${info.scope}*`);
      } else {
        citations.push(`- **${docName}** (${info.authority})`);
        citations.push(`  *${info.scope}*`);
      }
    });
    
    citations.push("\n**🎯 Relevant Criteria Areas:**");
    criteriaKeys.forEach(key => {
      const criteria = CRITERIA_MAPPINGS[key];
      if (criteria) {
        citations.push(`- ${criteria.name}`);
      }
    });
  }
  
  return citations.join('\n');
} 