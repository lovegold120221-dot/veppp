export type ArtifactType = 
  | 'contract' 
  | 'agreement' 
  | 'proposal' 
  | 'quotation' 
  | 'statement_of_work' 
  | 'invoice' 
  | 'csv' 
  | 'slides' 
  | 'pdf' 
  | 'letter' 
  | 'certificate' 
  | 'report';

export interface ArtifactData {
  type: ArtifactType;
  title: string;
  content: string;
  metadata?: {
    client?: string;
    date?: string;
    amount?: string;
    documentNumber?: string;
    [key: string]: any;
  };
}

/**
 * Detects if the user text is requesting document/artifact generation
 * and returns the artifact type to auto-generate. Returns null if nothing matches.
 */
export const detectArtifactRequest = (text: string): ArtifactType | null => {
  const t = text.toLowerCase();
  
  // Check for action verbs
  if (!/(create|draft|prepare|generate|make|build|write|produce|compose|issue|send me|give me|i need)/.test(t)) {
    // Allow short phrases too: "invoice for X", "contract for X"
  }
  
  if (/(contract|agreement)/.test(t)) return 'contract';
  if (/(agreement)/.test(t)) return 'agreement';
  if (/(proposal|propose)/.test(t)) return 'proposal';
  if (/(quotation|quote)/.test(t)) return 'quotation';
  if (/(statement of work|\bsow\b|scope document)/.test(t)) return 'statement_of_work';
  if (/(csv|spreadsheet|excel|sheet)/.test(t)) return 'csv';
  if (/(slide|deck|presentation|pptx|powerpoint)/.test(t)) return 'slides';
  if (/(pdf|report)/.test(t)) return 'pdf';
  if (/(letter|correspondence)/.test(t)) return 'letter';
  if (/(certificate|cert)/.test(t)) return 'certificate';
  if (/(invoice|bill)/.test(t)) return 'invoice';
  
  return null;
};

/**
 * Builds a complete artifact object from the detected type and user
 * prompt. Uses professional placeholders where the user did not supply
 * specifics — per the spec, the agent must never refuse to generate.
 */
export const buildArtifactFromPrompt = (
  type: ArtifactType, 
  userPrompt: string, 
  personaName = 'Beatrice', 
  userName = 'Boss'
): ArtifactData => {
  const today = new Date().toISOString().slice(0, 10);
  
  // Try to pull out a client/company name from the prompt.
  const forMatch = userPrompt.match(/\bfor\s+([A-Z][\w&.' -]{2,60})/);
  const clientName = forMatch ? forMatch[1].trim().replace(/[.,!?]+$/, '') : 'Client Company';
  
  // Try to pull out a dollar amount.
  const feeMatch = userPrompt.match(/\$\s*[\d,]+(?:\.\d{2})?/);
  const totalFee = feeMatch ? feeMatch[0].replace(/\s/g, '') : '$14,950.00';

  const baseParties = {
    contractor: {
      name: 'Eburon AI Solutions',
      address: '123 Tech Avenue, Silicon Valley, CA 94025',
      email: 'hello@eburon.ai',
      phone: '+1 (555) 123-4567',
    },
    client: {
      name: clientName,
      address: 'Client Address',
      email: 'client@example.com',
      phone: '+1 (555) 987-6543',
    },
  };

  const docNumber = `EA-${new Date().getFullYear()}-${Math.floor(Math.random() * 9000 + 1000)}`;

  switch (type) {
    case 'invoice':
      return {
        type: 'invoice',
        title: `Invoice #${docNumber}`,
        content: `INVOICE

Invoice Number: ${docNumber}
Date: ${today}
Due Date: ${new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)}

BILL TO:
${baseParties.client.name}
${baseParties.client.address}
${baseParties.client.email}
${baseParties.client.phone}

FROM:
${baseParties.contractor.name}
${baseParties.contractor.address}
${baseParties.contractor.email}
${baseParties.contractor.phone}

ITEMS DESCRIPTION:
1. AI Automation Services - ${userPrompt.trim() || 'Custom solution development'}
   Quantity: 1
   Rate: ${totalFee}
   Amount: ${totalFee}

SUBTOTAL: ${totalFee}
TAX (0%): $0.00
TOTAL: ${totalFee}

PAYMENT TERMS:
Net 30 days from invoice date.
Late payments subject to 1.5% monthly finance charge.

Thank you for your business!`,
        metadata: {
          client: clientName,
          date: today,
          amount: totalFee,
          documentNumber: docNumber,
        },
      };

    case 'contract':
      return {
        type: 'contract',
        title: `Service Agreement - ${docNumber}`,
        content: `SERVICE AGREEMENT

Agreement Number: ${docNumber}
Date: ${today}

PARTIES:
This Service Agreement ("Agreement") is entered into on ${today} between:

${baseParties.contractor.name} ("Contractor")
${baseParties.contractor.address}
${baseParties.contractor.email}
${baseParties.contractor.phone}

AND

${baseParties.client.name} ("Client")
${baseParties.client.address}
${baseParties.client.email}
${baseParties.client.phone}

SERVICES:
Contractor agrees to provide AI automation and software development services as described in Exhibit A attached hereto.

SCOPE OF WORK:
${userPrompt.trim() || 'AI automation services, assistant configuration, and deployment handoff.'}

TERM:
This Agreement shall commence on ${today} and continue until completion of services, unless terminated earlier pursuant to the terms herein.

COMPENSATION:
Client shall pay Contractor ${totalFee} for the services rendered under this Agreement.

PAYMENT TERMS:
50% upon signing, 50% upon completion.

CONFIDENTIALITY:
Both parties agree to maintain the confidentiality of all proprietary information shared during the course of this Agreement.

GOVERNING LAW:
This Agreement shall be governed by the laws of the State of California.

SIGNATURES:

_________________________
${baseParties.contractor.name}
Date: ${today}

_________________________
${baseParties.client.name}
Date: ${today}`,
        metadata: {
          client: clientName,
          date: today,
          amount: totalFee,
          documentNumber: docNumber,
        },
      };

    case 'proposal':
      return {
        type: 'proposal',
        title: `Project Proposal - ${docNumber}`,
        content: `PROJECT PROPOSAL

Proposal Number: ${docNumber}
Date: ${today}
Prepared for: ${baseParties.client.name}

EXECUTIVE SUMMARY:
This proposal outlines our comprehensive AI automation solution designed to streamline your operations and enhance productivity.

PROJECT OVERVIEW:
${userPrompt.trim() || 'Custom AI automation and integration services'}

SCOPE OF DELIVERABLES:
1. Requirements Analysis and Design
2. AI Model Development and Training
3. System Integration and Testing
4. User Training and Documentation
5. Ongoing Support and Maintenance

TIMELINE:
- Phase 1: Discovery & Design (2 weeks)
- Phase 2: Development (4 weeks)
- Phase 3: Testing & Integration (2 weeks)
- Phase 4: Training & Deployment (1 week)

INVESTMENT:
Total Project Cost: ${totalFee}
Payment Schedule:
- 30% upon project commencement
- 40% at Phase 2 completion
- 30% upon final delivery

NEXT STEPS:
1. Review and approval of this proposal
2. Execution of Service Agreement
3. Project kick-off meeting

We look forward to partnering with you on this exciting project!

Best regards,
${personaName}
${baseParties.contractor.name}`,
        metadata: {
          client: clientName,
          date: today,
          amount: totalFee,
          documentNumber: docNumber,
        },
      };

    case 'agreement':
      return {
        type: 'agreement',
        title: `Partnership Agreement - ${docNumber}`,
        content: `PARTNERSHIP AGREEMENT

Agreement Number: ${docNumber}
Date: ${today}

PARTIES:
${baseParties.contractor.name} and ${baseParties.client.name}

RECITALS:
WHEREAS, the parties wish to enter into a strategic partnership for mutual benefit;

NOW, THEREFORE, the parties agree as follows:

ARTICLE 1 - PURPOSE
To establish a collaborative relationship for ${userPrompt.trim() || 'AI automation services'}.

ARTICLE 2 - RESPONSIBILITIES
Each party shall contribute expertise and resources as outlined in Schedule A.

ARTICLE 3 - TERM
This agreement shall remain in effect for a period of one year from ${today}.

ARTICLE 4 - COMPENSATION
Revenue sharing model as detailed in Schedule B.

ARTICLE 5 - CONFIDENTIALITY
All proprietary information shall remain confidential.

ARTICLE 6 - TERMINATION
Either party may terminate with 30 days written notice.

SIGNATURES:

_________________________
${baseParties.contractor.name}

_________________________
${baseParties.client.name}`,
        metadata: {
          client: clientName,
          date: today,
          documentNumber: docNumber,
        },
      };

    case 'quotation':
      return {
        type: 'quotation',
        title: `Price Quotation - ${docNumber}`,
        content: `PRICE QUOTATION

Quotation Number: ${docNumber}
Date: ${today}
Valid Until: ${new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)}

TO: ${baseParties.client.name}
FROM: ${baseParties.contractor.name}

SUBJECT: Quotation for ${userPrompt.trim() || 'AI Automation Services'}

ITEMIZED PRICING:

1. AI System Development
   - Requirements Analysis: $2,500
   - Model Training: $5,000
   - Integration: $3,000
   - Testing: $1,500
   Subtotal: $12,000

2. Training & Documentation
   - User Training: $1,000
   - Technical Documentation: $800
   Subtotal: $1,800

3. Support & Maintenance (3 months)
   - Ongoing Support: $1,500
   Subtotal: $1,500

TOTAL QUOTATION: ${totalFee}

TERMS AND CONDITIONS:
- Prices are valid for 30 days from quotation date
- Payment terms: 50% advance, 50% on completion
- Warranty: 90 days on all deliverables
- Support: Email and phone support during business hours

This quotation is prepared based on our understanding of your requirements. Please review and let us know if you need any modifications.

Thank you for your consideration!

${personaName}
${baseParties.contractor.name}`,
        metadata: {
          client: clientName,
          date: today,
          amount: totalFee,
          documentNumber: docNumber,
        },
      };

    case 'statement_of_work':
      return {
        type: 'statement_of_work',
        title: `Statement of Work - ${docNumber}`,
        content: `STATEMENT OF WORK

SOW Number: ${docNumber}
Project: ${userPrompt.trim() || 'AI Automation Implementation'}
Date: ${today}
Client: ${baseParties.client.name}

1. PROJECT OVERVIEW
This Statement of Work (SOW) defines the scope, deliverables, timeline, and responsibilities for the AI automation project.

2. SCOPE OF WORK
${userPrompt.trim() || 'AI automation services, assistant configuration, and deployment handoff.'}

3. DELIVERABLES
3.1 Requirements Documentation
3.2 AI Model Implementation
3.3 System Integration
3.4 User Training Materials
3.5 Technical Documentation

4. PROJECT TIMELINE
Phase 1: Discovery (Week 1-2)
- Requirements gathering
- System analysis
- Technical design

Phase 2: Development (Week 3-6)
- AI model development
- System integration
- Initial testing

Phase 3: Testing (Week 7-8)
- Quality assurance
- User acceptance testing
- Performance optimization

Phase 4: Deployment (Week 9)
- Production deployment
- User training
- Documentation handoff

5. ACCEPTANCE CRITERIA
- All deliverables completed as specified
- System performance meets requirements
- User training completed
- Documentation delivered

6. PROJECT TEAM
- Project Manager: ${personaName}
- Lead Developer: TBD
- QA Engineer: TBD

7. COMMUNICATION
- Weekly progress reports
- Bi-weekly stakeholder meetings
- Ad-hoc meetings as needed

APPROVED BY:

_________________________
Client Representative
Date: ${today}

_________________________
Contractor Representative
${personaName}
Date: ${today}`,
        metadata: {
          client: clientName,
          date: today,
          documentNumber: docNumber,
        },
      };

    case 'csv':
      return {
        type: 'csv',
        title: 'Data Export',
        content: `Name,Email,Department,Status,Join Date
John Doe,john.doe@company.com,Engineering,Active,2023-01-15
Jane Smith,jane.smith@company.com,Marketing,Active,2023-02-20
Bob Wilson,bob.wilson@company.com,Sales,Active,2023-03-10
Alice Brown,alice.brown@company.com,HR,Active,2023-04-05
Charlie Davis,charlie.davis@company.com,Finance,Active,2023-05-12`,
        metadata: {
          client: clientName,
          date: today,
        },
      };

    case 'slides':
      return {
        type: 'slides',
        title: 'Presentation Deck',
        content: `Slide 1: Title Slide
${userPrompt.trim() || 'AI Automation Solutions'}

Slide 2: Introduction
- Company Overview
- Project Objectives
- Expected Outcomes

Slide 3: Current Challenges
- Manual Processes
- Efficiency Gaps
- Opportunities for Improvement

Slide 4: Proposed Solution
- AI Automation Strategy
- Technology Stack
- Implementation Approach

Slide 5: Benefits
- Increased Efficiency
- Cost Reduction
- Enhanced Accuracy

Slide 6: Timeline
- Project Phases
- Key Milestones
- Delivery Schedule

Slide 7: Investment
- Cost Breakdown
- ROI Analysis
- Payment Terms

Slide 8: Next Steps
- Implementation Plan
- Success Metrics
- Ongoing Support

Slide 9: Q&A
- Common Questions
- Technical Details
- Support Information

Slide 10: Thank You
- Contact Information
- Follow-up Actions`,
        metadata: {
          client: clientName,
          date: today,
        },
      };

    case 'pdf':
      return {
        type: 'pdf',
        title: 'Document Report',
        content: `${userPrompt.trim() || 'AI Implementation Report'}

Executive Summary:
This report outlines the comprehensive AI automation solution designed to transform your business operations.

Key Findings:
- Current processes show 40% manual intervention
- Automation potential identified in 5 key areas
- Expected ROI: 250% within 12 months

Recommendations:
1. Implement AI-powered workflow automation
2. Deploy intelligent document processing
3. Establish predictive analytics capabilities
4. Create automated reporting systems
5. Develop customer service AI assistants

Implementation Timeline:
Phase 1: Requirements Analysis (2 weeks)
Phase 2: System Design (3 weeks)
Phase 3: Development (6 weeks)
Phase 4: Testing (2 weeks)
Phase 5: Deployment (1 week)

Budget Overview:
Total Investment: ${totalFee}
Expected Annual Savings: ${parseFloat(totalFee.replace(/[$,]/g, '')) * 2.5}

Conclusion:
The proposed AI automation solution will significantly enhance operational efficiency while reducing costs and improving service quality.`,
        metadata: {
          client: clientName,
          date: today,
        },
      };

    case 'letter':
      return {
        type: 'letter',
        title: 'Business Letter',
        content: `${baseParties.contractor.name}
${baseParties.contractor.address}
${baseParties.contractor.email}
${baseParties.contractor.phone}

${today}

${baseParties.client.name}
${baseParties.client.address}
${baseParties.client.address}

Dear ${baseParties.client.name.split(' ')[0]},

Re: ${userPrompt.trim() || 'AI Automation Services'}

I hope this letter finds you well. I am writing to follow up on our recent discussion regarding your AI automation needs.

Based on our conversation, I believe our comprehensive AI solutions can significantly benefit your operations. Our team has extensive experience in implementing intelligent automation systems that drive efficiency and reduce operational costs.

We would be pleased to provide you with a detailed proposal outlining our approach, timeline, and investment requirements. Our solutions are tailored to meet your specific business requirements while ensuring seamless integration with your existing systems.

Would you be available for a brief call next week to discuss this further? I am confident we can demonstrate substantial value for your organization.

Thank you for your time and consideration. I look forward to hearing from you soon.

Best regards,

${personaName}
${baseParties.contractor.name}
${baseParties.contractor.email}
${baseParties.contractor.phone}`,
        metadata: {
          client: clientName,
          date: today,
        },
      };

    case 'certificate':
      return {
        type: 'certificate',
        title: 'Certificate of Completion',
        content: `CERTIFICATE OF COMPLETION

This is to certify that

${baseParties.client.name}

has successfully completed the

${userPrompt.trim() || 'AI Automation Training Program'}

on ${today}

Program Highlights:
✓ AI Fundamentals and Applications
✓ Automation Framework Design
✓ Implementation Best Practices
✓ System Integration Techniques
✓ Performance Optimization

Certificate Number: ${docNumber}
Issued by: ${baseParties.contractor.name}
Valid until: ${new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)}

_________________________
${personaName}
Program Director
${baseParties.contractor.name}

_________________________
Authorized Signature`,
        metadata: {
          client: clientName,
          date: today,
          documentNumber: docNumber,
        },
      };

    case 'report':
      return {
        type: 'report',
        title: 'Project Report',
        content: `PROJECT REPORT

Report Number: ${docNumber}
Date: ${today}
Project: ${userPrompt.trim() || 'AI Automation Implementation'}
Client: ${baseParties.client.name}

EXECUTIVE SUMMARY:
This report summarizes the successful completion of the AI automation project for ${baseParties.client.name}.

PROJECT OVERVIEW:
The project aimed to implement comprehensive AI automation solutions to enhance operational efficiency and reduce manual intervention.

KEY ACHIEVEMENTS:
• Automated 85% of manual processes
• Reduced processing time by 60%
• Improved accuracy to 99.5%
• Achieved cost savings of ${totalFee} annually

TECHNICAL IMPLEMENTATION:
• AI Model Development and Training
• System Integration and Testing
• User Training and Documentation
• Ongoing Support and Maintenance

PERFORMANCE METRICS:
• System Uptime: 99.9%
• Response Time: < 2 seconds
• Error Rate: < 0.5%
• User Satisfaction: 95%

CHALLENGES AND SOLUTIONS:
Challenge: Data Migration Complexity
Solution: Implemented phased migration approach

Challenge: User Adoption
Solution: Comprehensive training program

RECOMMENDATIONS:
1. Continue monitoring system performance
2. Implement additional automation opportunities
3. Expand to other departments
4. Regular system updates and maintenance

CONCLUSION:
The AI automation project has been successfully completed with exceptional results. The system is performing above expectations and delivering significant value to the organization.

Prepared by:
${personaName}
${baseParties.contractor.name}

Approved by:
_________________________
Client Representative
Date: ${today}`,
        metadata: {
          client: clientName,
          date: today,
          documentNumber: docNumber,
        },
      };

    default:
      return {
        type: 'pdf',
        title: 'Document',
        content: userPrompt.trim() || 'Document content',
        metadata: {
          client: clientName,
          date: today,
        },
      };
  }
};
