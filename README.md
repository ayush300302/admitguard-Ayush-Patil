# AdmitGuard: Enterprise Admission Validation System

## Problem Statement
Educational institutions often struggle with manual, Excel-based admission data entry. This process is highly susceptible to human error, lacks real-time eligibility verification, and provides no structured audit trail for exceptions. Ineligible candidates are often processed too far into the pipeline before errors are caught, leading to operational inefficiency and compliance risks.

## Approach: The "AdmitGuard" Solution
AdmitGuard is a production-grade internal tool that enforces compliance at the point of entry. 
- **Configurable Rules Engine**: Decouples validation logic from the UI, allowing rules to be updated without code changes.
- **Strict vs. Soft Validation**: Differentiates between hard requirements (e.g., valid email) and flexible criteria (e.g., age) that allow for documented exceptions.
- **Audit-First Design**: Every submission is logged with a full snapshot of data and justifications for any rule overrides.
- **Vibe-Driven UI**: A clean, professional interface built with React and Tailwind CSS that prioritizes scannability and user guidance.
- **Data Visualization**: Integrated charts showing enrollment trends and qualification distributions.
- **UX Enhancements**: Real-time toast notifications and automatic form draft persistence.

## Setup Instructions
1. **Clone the repository**:
   ```bash
   git clone <your-repo-url>
   cd admitguard
   ```
2. **Install dependencies**:
   ```bash
   npm install
   ```
3. **Run the development server**:
   ```bash
   npm run dev
   ```
4. **Build for production**:
   ```bash
   npm run build
   ```


## Technologies Used
- **Frontend**: React 19, TypeScript, Tailwind CSS
- **Animation**: Motion (formerly Framer Motion)
- **Icons**: Lucide React
- **Validation**: Custom Rules Engine
- **State**: LocalStorage Persistence
