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
   
## Screenshots
*(Add your screenshots here)*
- [Dashboard Overview]
  <img width="1142" height="822" alt="image" src="https://github.com/user-attachments/assets/0c093b0d-06bd-4e6f-9104-08ef12e57499" />

- [Dynamic Enrollment Form]
<img width="1312" height="819" alt="image" src="https://github.com/user-attachments/assets/cb4004dc-ad7d-428c-aced-2061d401018f" />


- [Audit Log with Exceptions]
  <img width="1293" height="808" alt="image" src="https://github.com/user-attachments/assets/f7cc1b7c-f61d-4d13-95c2-f6be0a68f1b4" />


  


## Technologies Used
- **Frontend**: React 19, TypeScript, Tailwind CSS
- **Animation**: Motion (formerly Framer Motion)
- **Icons**: Lucide React
- **Validation**: Custom Rules Engine
- **State**: LocalStorage Persistence
