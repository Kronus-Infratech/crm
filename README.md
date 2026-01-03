# Kronus CRM: System Handover Document (Operational)

This document provides a comprehensive functional overview of the Kronus CRM system. It is designed for non-technical stakeholders to understand every operational feature and the value it brings to the business.

---

## 1. User Sanctuary & Security Management
*Focus: Protecting account integrity and managing personal workspace settings.*

*   **Session-Secure Login**: The system uses a "closed-door" policy. Sessions are cleared automatically when a user closes their browser or tab, ensuring unauthorized access is impossible on shared workstations.
*   **Encrypted Credential Handling**: High-tier security measures (HTTPS/Strict-Site) prevent password sniffing and cross-site attacks.
*   **Smart Rate Limiting**: Protects the system from brute-force login attempts by temporarily blocking suspicious entry patterns.
*   **Self-Service Password Recovery**: An automated flow that allows users to reset forgotten passwords via a secure link sent to their registered email.
*   **Profile Identity Hub**: Each user can manage their personal details including Full Name, Contact Number, Department, and Designation.
*   **Online Presence Indicator**: Displays "Online" or "Away" status based on recent system activity, aiding team coordination.

## 2. Comprehensive Lead Portfolio
*Focus: A centralized repository for all potential clients and their deal metrics.*

*   **Universal Lead Capture**: Support for multiple lead origins including Website, Referral, Instagram, YouTube, Email, WhatsApp, MagicBricks, OLX, and Cold Outreach.
*   **Enhanced "Walk-In" Tracking**: A specialized source for physical office visits.
*   **Property Interest Alignment**: Every lead is tagged with a specific property or project (e.g., "Kronus Heights 3BHK"), ensuring focused sales pitches.
*   **Priority Tiering**: Leads range from "Low" to "Urgent," allowing agents to prioritize their day effectively.
*   **Internal Search Engine**: A powerful search bar that scans names, phone numbers, and property types instantly.
*   **Advanced Data Filtering**: Tools to narrow down lead lists by their lifecycle status (e.g., "Site Visit") or their source (e.g., "99 Acres").

## 3. Sales Pipeline & Operational Workflow
*Focus: Tools designed to drive leads toward conversion.*

*   **Dynamic Lead Assignment**: Managers can assign leads to specific agents. The system also supports "Unassigned" leads to maintain a common pool for the team.
*   **8-Stage Lifecycle Tracking**: Tracks leads through: New -> Contacted -> Interested -> Site Visit -> Negotiation -> Documentation -> Won -> Lost.
*   **Hard Closing Protocol**: When a lead is marked "Won" or "Lost," the system prompts for a final reason, which is permanently logged in the history.
*   **Revival Mechanism (Reopening)**: Allows agents to revive "Won" or "Lost" leads with a mandatory explanation, ensuring no potential deal is ever truly discarded.
*   **Smart Follow-up Scheduler**: Integrated date selector to set next points of contact.
*   **Overdue Alerts**: Visual "Overdue" badges appear for leads whose follow-up dates have passed, preventing lead leakage.
*   **Chronological Activity Audit**: A minute-by-minute log of every change made to a lead (e.g., "Assigned to Rahul," "Status changed to Negotiation"), including who made the change.

## 4. Business Intelligence & Analytics Hub
*Focus: High-level data visualizations for decision-makers.*

*   **Global Revenue Snapshot**: Real-time display of total pipeline value and revenue breakdowns.
*   **Strategic Distribution Charts**:
    *   **Source Performance**: Visualizes which marketing channels (YT, FB, 99Acres) are delivering the most leads.
    *   **Pipeline Health**: A status-based donut chart showing where deals are currently stuck.
*   **Performance Radar**: A unique chart that compares agent productivity (Win rates vs. Value) using normalized metrics for a fair assessment across different lead volumes.
*   **Monthly Trend Analysis**: Graphs showing the volume of lead acquisition over the last 6 months to identify seasonal trends.
*   **Employee Leaderboard**: A detailed table tracking every agent\'s total leads, win rates, and total pipeline value.

## 5. Team Governance & Access Infrastructure
*Focus: Managing the organizational hierarchy and permission levels.*

*   **5-Tier Role Hierarchy**:
    1.  **Admin**: Full system control.
    2.  **Director & Executive**: Global visibility and high-level strategy tools.
    3.  **Manager**: Team-level oversight and lead distribution.
    4.  **Salesman**: Focused execution on assigned leads.
*   **Automated Onboarding**: When a new user is created, the system generates a complex temporary password and sends a professional "Welcome Email" automatically.
*   **Security-First "Soft Delete"**: Instead of hard-deleting users (which would break historical records), the system "Deactivates" them, preserving their historical data while revoking all access.
*   **Departmental Silos**: Support for tagging users by department (Sales, Marketing, Finance) for future reporting segments.

## 6. Automation & External Connectivity
*Focus: Background services that keep the business moving without manual effort.*

*   **99 Acres Direct Ingestion**: A specialized API that automatically imports leads from 99Acres directly into the CRM, eliminating manual entry errors.
*   **Managed Notification Queue**: All system emails (Welcome letters, Lead assignments) are processed in an "Asynchronous Queue." This means the CRM stays fast and responsive even when sending hundreds of emails.
*   **Daily Agent Reminders (IST Timezone)**:
    *   **11:00 AM Prompt**: Sends a "Today\'s Schedule" email to all agents listing their planned follow-ups.
    *   **3:00 PM Prompt**: Sends a "Tomorrow\'s Preview" email so agents can plan their next day in advance.
*   **Doc-Vault Integration**: Secure cloud storage for lead-related documents (ID proofs, floor plans, booking forms) with instant thumbnail previews for images.
*   **Self-Healing Error Logs**: A background monitor that records any system issues for the IT team to review, ensuring maximum uptime.