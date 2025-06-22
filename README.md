# 🏢 Neemandu Inquiries - Business Management System

A comprehensive business management platform built with Next.js, designed to streamline employee management and inquiry handling processes for Israeli businesses.

## 🌟 Features

### 👥 Employee Management

- **Employee Database**: Complete employee records with personal details, salary information, and employment dates
- **Payslip Generation**: Automated payslip creation and PDF viewing with zoom, rotation, and print capabilities
- **Employee Recognition**: Track and manage employee achievements and recognition programs
- **Vacation Management**: Handle employee vacation requests and tracking
- **Monthly Reports**: Generate comprehensive monthly employee reports
- **Dynamic Column Management**: Customizable data views for different reporting needs

### 📋 Inquiry Management

- **Monthly Inquiries**: Handle supplier-related monthly inquiries with document management
- **Yearly Inquiries**: Process annual business inquiries and compliance requirements
- **Supplier Management**: Organize inquiries by supplier with filtering capabilities
- **Document Upload**: Secure file upload system with PDF support
- **Real-time Processing**: Automated webhook integration for data processing

### 🔐 Authentication & Security

- Clerk authentication integration for secure user management
- Protected routes and user session handling
- Role-based access control

### 🎨 Modern UI/UX

- Hebrew RTL (Right-to-Left) language support
- Responsive design with Tailwind CSS
- Modern component library with Radix UI
- Dark/light theme support
- Professional styling with intuitive navigation

## 🛠️ Technology Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS with custom components
- **Authentication**: Clerk
- **Forms**: React Hook Form with Zod validation
- **PDF Processing**: react-pdf with pdfjs-dist
- **UI Components**: Radix UI primitives
- **File Handling**: Base64 encoding for secure file transfer
- **API Integration**: Webhook-based data processing with Make.com

## 📁 Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes for data handling
│   ├── inquiries/         # Inquiry management pages
│   └── sign-in/           # Authentication pages
├── components/            # Reusable UI components
│   ├── employee/          # Employee management components
│   ├── inquiries/         # Inquiry handling components
│   └── ui/               # Base UI components
└── lib/                  # Utilities and type definitions
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm, yarn, pnpm, or bun

### Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd inquiries
```

2. Install dependencies:

```bash
npm install
# or
yarn install
# or
pnpm install
```

3. Set up environment variables:

```bash
cp .env.example .env.local
```

4. Configure Clerk authentication keys in `.env.local`

5. Run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser

## 🔧 Configuration

### Environment Variables

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`: Clerk public key
- `CLERK_SECRET_KEY`: Clerk secret key
- `NEXT_PUBLIC_CLERK_SIGN_IN_URL`: Sign-in page URL
- `NEXT_PUBLIC_CLERK_SIGN_UP_URL`: Sign-up page URL

### API Integrations

The application integrates with external webhooks for:

- Employee data processing
- Inquiry submission handling
- Document management
- PDF generation

## 📱 Key Components

### Employee Management

- **AddEmployee**: New employee onboarding with document upload
- **PaySlip**: PDF payslip viewer with advanced controls
- **EmployeeRecognition**: Achievement tracking system
- **MonthlyReport**: Comprehensive reporting dashboard

### Inquiry System

- **YearlyForm**: Annual inquiry submission with file attachments
- **SupplierTable**: Organized supplier inquiry management
- **FileUploadComponent**: Secure document handling

## 🌐 Deployment

### Build for Production

```bash
npm run build
npm start
```

### Deploy on Vercel

The easiest way to deploy is using the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme).

Check out the [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is proprietary software. All rights reserved.

## 📞 Support

For technical support or business inquiries, please contact the development team.

---

Built with ❤️ for streamlined business management
