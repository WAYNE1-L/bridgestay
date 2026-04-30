# BridgeStay Analytics

A comprehensive real estate investment analysis platform built with React, TypeScript, and modern web technologies.

## 🚀 Features

- **ROI Calculator**: Calculate return on investment with detailed financial metrics
- **Cash Flow Analysis**: Analyze monthly and annual cash flow projections  
- **Investment Dashboard**: Track and compare multiple properties
- **Professional Reports**: Generate comprehensive investment reports
- **Multi-language Support**: English and Chinese (中文) localization
- **Responsive Design**: Works seamlessly on desktop and mobile
- **Dark Mode**: Toggle between light and dark themes
- **Export Capabilities**: PDF, PNG, and JSON export options
- **Real-time Calculations**: Instant updates as you input data
- **Security First**: Comprehensive security headers and best practices

## 🛠️ Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS 4.x
- **Charts**: Recharts
- **Routing**: React Router v6
- **State Management**: Zustand
- **Validation**: Zod
- **Testing**: Vitest, Playwright
- **Internationalization**: i18next
- **Error Monitoring**: Sentry
- **Deployment**: Netlify, Vercel, Zeabur ready

## 🚀 Quick Start

### Prerequisites

- Node.js 20.19+ or 22.12+
- npm 10+

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/bridgestay-analytics.git
   cd bridgestay-analytics
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your configuration
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to `http://localhost:5173`

## 📁 Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── ui/             # Base UI components (Button, Card, etc.)
│   ├── layout/         # Layout components (AppLayout, etc.)
│   └── ...             # Feature-specific components
├── pages/              # Page components
│   ├── HomePage.tsx
│   ├── DashboardPage.tsx
│   ├── RoiPage.tsx
│   └── ReportsPage.tsx
├── lib/                # Utility libraries
│   ├── finance.ts      # Financial calculations
│   ├── format.ts       # Number/currency formatting
│   ├── i18n.ts         # Internationalization
│   ├── errorLogger.ts  # Error monitoring
│   └── ...             # Other utilities
├── hooks/              # Custom React hooks
├── types/              # TypeScript type definitions
└── workers/            # Web Workers for heavy calculations
```

## 🧪 Testing

### Unit Tests
```bash
npm run test          # Run tests in watch mode
npm run test:run      # Run tests once
npm run test:coverage # Run with coverage
```

### E2E Tests
```bash
npm run test:e2e      # Run Playwright tests
npm run test:e2e:ui   # Run with UI
```

### All Tests
```bash
npm run check         # TypeScript + ESLint
npm run build         # Production build
```

## 🚀 Deployment

### Netlify
1. Connect your GitHub repository to Netlify
2. Build command: `npm run build`
3. Publish directory: `dist`
4. Environment variables: Add your Sentry DSN and other config

### Vercel
1. Import your GitHub repository to Vercel
2. Framework preset: Vite
3. Build command: `npm run build`
4. Output directory: `dist`

### Zeabur
1. Connect your GitHub repository to Zeabur
2. Select "Static Site" type
3. Build command: `npm run build`
4. Output directory: `dist`

## 🔧 Configuration

### Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `VITE_SENTRY_DSN` | Sentry error monitoring DSN | No | - |
| `VITE_ANALYTICS_ID` | Analytics tracking ID | No | - |
| `VITE_ENABLE_ERROR_REPORTING` | Enable error reporting | No | `true` |
| `VITE_ENABLE_PERFORMANCE_MONITORING` | Enable performance monitoring | No | `true` |

### Security Headers

The application includes comprehensive security headers configured for all deployment platforms:

- **Content Security Policy (CSP)**: Prevents XSS attacks
- **HTTP Strict Transport Security (HSTS)**: Forces HTTPS
- **X-Frame-Options**: Prevents clickjacking
- **X-Content-Type-Options**: Prevents MIME sniffing
- **Referrer Policy**: Controls referrer information
- **Permissions Policy**: Restricts browser features

## 🌍 Internationalization

The application supports multiple languages:

- **English (en)**: Default language
- **Chinese (zh)**: 中文支持

To add a new language:

1. Add translations to `src/lib/i18n.ts`
2. Update the `LanguageSwitcher` component
3. Test with `npm run dev`

## 📊 Performance

### Bundle Analysis
```bash
npm run analyze        # Analyze bundle size
```

### Lighthouse CI
```bash
npm run lighthouse:ci  # Run Lighthouse audits
```

### Performance Metrics
- **Largest chunk**: <200KB gzipped
- **Initial bundle**: Optimized with code splitting
- **Dynamic imports**: Heavy libraries loaded on demand
- **Web Vitals**: Monitored and reported

## 🔒 Security

### Security Features
- Input validation with Zod schemas
- XSS protection via CSP headers
- CSRF protection via SameSite cookies
- Secure error handling without information leakage
- Regular dependency audits

### Security Checklist
- [x] Content Security Policy implemented
- [x] HSTS headers configured
- [x] X-Frame-Options set to DENY
- [x] Input validation with Zod
- [x] Error handling without information leakage
- [x] HTTPS enforcement
- [x] Automated security audits in CI/CD

## 🤝 Contributing

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Make your changes**
4. **Run tests**
   ```bash
   npm run check
   npm run test:run
   npm run test:e2e
   ```
5. **Commit your changes**
   ```bash
   git commit -m "Add amazing feature"
   ```
6. **Push to the branch**
   ```bash
   git push origin feature/amazing-feature
   ```
7. **Open a Pull Request**

### Development Guidelines

- Follow TypeScript best practices
- Write tests for new features
- Update documentation as needed
- Follow the existing code style
- Use conventional commit messages

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: Check this README and inline code comments
- **Issues**: Open an issue on GitHub
- **Discussions**: Use GitHub Discussions for questions
- **Security**: Report security issues privately

## 🗺️ Roadmap

- [ ] **Advanced Analytics**: More sophisticated financial models
- [ ] **Property Database**: Save and manage property portfolios
- [ ] **Market Data Integration**: Real-time market data
- [ ] **Collaboration Features**: Share analyses with team members
- [ ] **Mobile App**: React Native mobile application
- [ ] **API**: RESTful API for third-party integrations

## 🙏 Acknowledgments

- **React Team**: For the amazing React framework
- **Vite Team**: For the lightning-fast build tool
- **Tailwind CSS**: For the utility-first CSS framework
- **Recharts**: For beautiful chart components
- **Sentry**: For error monitoring and performance tracking

---

**Built with ❤️ for real estate investors**