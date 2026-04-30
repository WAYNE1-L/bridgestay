# ASSUMPTIONS

This document outlines the key assumptions and design decisions made in BridgeStay Analytics.

## 🏗️ Architecture Assumptions

### Frontend Architecture
- **Single Page Application (SPA)**: Assumes modern browsers with JavaScript enabled
- **Client-side Routing**: All navigation handled by React Router
- **Progressive Enhancement**: Core functionality works without JavaScript for basic use cases
- **Responsive Design**: Assumes mobile-first approach with desktop enhancements

### Technology Stack
- **React 18+**: Assumes modern React features (hooks, concurrent features)
- **TypeScript**: Assumes type safety is preferred over dynamic typing
- **Vite**: Assumes modern build tooling with ES modules
- **Tailwind CSS**: Assumes utility-first CSS approach

## 💰 Financial Model Assumptions

### ROI Calculations
- **Monthly Cash Flow**: Calculated as (Monthly Rent - Monthly Expenses)
- **Annual Cash Flow**: Monthly Cash Flow × 12
- **Cap Rate**: Annual Cash Flow ÷ Purchase Price
- **ROI**: Annual Cash Flow ÷ Down Payment
- **Mortgage Payments**: Calculated using standard PMT formula

### Expense Categories
- **Property Tax**: Assumed as percentage of purchase price
- **Insurance**: Assumed as monthly fixed amount
- **HOA Fees**: Assumed as monthly fixed amount
- **Management**: Assumed as percentage of monthly rent
- **Maintenance**: Assumed as percentage of monthly rent
- **Vacancy**: Assumed as percentage of monthly rent

### Financing Assumptions
- **Fixed Interest Rate**: Assumes constant rate over loan term
- **Monthly Payments**: Assumes standard amortization schedule
- **Down Payment**: Assumes minimum 20% for conventional loans
- **Loan Terms**: Assumes 15-30 year terms

## 🌍 Market Assumptions

### Property Types
- **Residential Rental**: Assumes single-family homes, condos, townhouses
- **Commercial Properties**: Not currently supported
- **Multi-family**: Basic support for duplexes, triplexes
- **Short-term Rentals**: Not currently supported

### Geographic Scope
- **US Market**: Assumes US-based properties and regulations
- **Currency**: Assumes USD as primary currency
- **Tax Implications**: Assumes US tax structure
- **Regulations**: Assumes US landlord-tenant laws

## 🔧 Technical Assumptions

### Browser Support
- **Modern Browsers**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **ES2020+**: Assumes modern JavaScript features
- **CSS Grid/Flexbox**: Assumes modern CSS layout support
- **Web Workers**: Assumes Web Worker support for heavy calculations

### Performance Assumptions
- **Network**: Assumes broadband internet connection
- **Device**: Assumes modern devices with sufficient memory
- **Storage**: Assumes localStorage availability
- **CPU**: Assumes multi-core processors for Web Workers

### Security Assumptions
- **HTTPS**: Assumes secure connections in production
- **CSP**: Assumes Content Security Policy support
- **SameSite Cookies**: Assumes modern cookie security features
- **CORS**: Assumes proper CORS configuration for APIs

## 📊 Data Assumptions

### Input Validation
- **Numeric Inputs**: Assumes positive numbers for most financial fields
- **Percentage Fields**: Assumes 0-100% range
- **Currency Fields**: Assumes USD currency format
- **Date Fields**: Assumes standard date formats

### Data Persistence
- **Local Storage**: Assumes localStorage availability and persistence
- **Session Storage**: Assumes sessionStorage for temporary data
- **IndexedDB**: Not currently used but assumed available
- **Cookies**: Assumes cookie support for preferences

### Data Privacy
- **No Personal Data**: Assumes no collection of personally identifiable information
- **Local Processing**: Assumes all calculations done client-side
- **No Server Storage**: Assumes no server-side data storage
- **Analytics**: Assumes optional analytics with user consent

## 🌐 Internationalization Assumptions

### Language Support
- **English**: Assumes English as primary language
- **Chinese**: Assumes Simplified Chinese support
- **RTL Languages**: Not currently supported
- **Character Encoding**: Assumes UTF-8 encoding

### Cultural Assumptions
- **Number Formats**: Assumes US number formatting (commas for thousands)
- **Date Formats**: Assumes MM/DD/YYYY format
- **Currency**: Assumes USD as primary currency
- **Text Direction**: Assumes left-to-right text direction

## 🚀 Deployment Assumptions

### Hosting Platforms
- **Static Hosting**: Assumes static site hosting (Netlify, Vercel, Zeabur)
- **CDN**: Assumes CDN availability for global distribution
- **SSL Certificates**: Assumes automatic SSL certificate management
- **Custom Domains**: Assumes custom domain support

### Environment Variables
- **Build-time**: Assumes environment variables available at build time
- **Runtime**: Assumes limited runtime environment variable access
- **Secrets**: Assumes secure secret management
- **Configuration**: Assumes configuration via environment variables

## 🔍 Monitoring Assumptions

### Error Tracking
- **Sentry Integration**: Assumes Sentry for error monitoring
- **Error Boundaries**: Assumes React Error Boundaries for error handling
- **Console Logging**: Assumes console logging for development
- **User Feedback**: Assumes optional user feedback collection

### Performance Monitoring
- **Web Vitals**: Assumes Web Vitals API availability
- **Performance Observer**: Assumes Performance Observer API
- **Resource Timing**: Assumes Resource Timing API
- **Navigation Timing**: Assumes Navigation Timing API

## 📱 User Experience Assumptions

### Accessibility
- **Screen Readers**: Assumes screen reader compatibility
- **Keyboard Navigation**: Assumes full keyboard accessibility
- **Color Contrast**: Assumes WCAG 2.1 AA compliance
- **Focus Management**: Assumes proper focus management

### User Behavior
- **Progressive Disclosure**: Assumes users prefer step-by-step interfaces
- **Real-time Feedback**: Assumes users want immediate calculation updates
- **Export Needs**: Assumes users want to export/share results
- **Mobile Usage**: Assumes significant mobile device usage

## 🔮 Future Assumptions

### Scalability
- **User Growth**: Assumes potential for thousands of concurrent users
- **Feature Expansion**: Assumes modular architecture for new features
- **API Integration**: Assumes future API integrations
- **Database Migration**: Assumes potential migration to database storage

### Technology Evolution
- **Framework Updates**: Assumes regular React/TypeScript updates
- **Browser Evolution**: Assumes continued browser feature support
- **Performance Improvements**: Assumes ongoing performance optimization
- **Security Updates**: Assumes regular security updates and patches

## ⚠️ Risk Assumptions

### Technical Risks
- **Browser Compatibility**: Risk of older browser incompatibility
- **Performance Degradation**: Risk of performance issues on older devices
- **Security Vulnerabilities**: Risk of security vulnerabilities in dependencies
- **Data Loss**: Risk of localStorage data loss

### Business Risks
- **Market Changes**: Risk of real estate market changes affecting calculations
- **Regulatory Changes**: Risk of regulatory changes affecting assumptions
- **User Adoption**: Risk of low user adoption
- **Competition**: Risk of competitive pressure

## 📋 Validation Assumptions

### Testing Assumptions
- **Unit Tests**: Assumes comprehensive unit test coverage
- **Integration Tests**: Assumes integration test coverage
- **E2E Tests**: Assumes end-to-end test coverage
- **Performance Tests**: Assumes performance test coverage

### Quality Assurance
- **Code Reviews**: Assumes peer code reviews
- **Automated Testing**: Assumes CI/CD automated testing
- **Manual Testing**: Assumes manual testing for critical paths
- **User Testing**: Assumes user acceptance testing

---

**Note**: These assumptions should be regularly reviewed and updated as the project evolves and new requirements emerge.
