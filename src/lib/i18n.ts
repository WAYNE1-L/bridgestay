/**
 * Internationalization configuration
 * Supports English (en) and Chinese (zh)
 */

import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

// English translations
const en = {
  translation: {
    // Navigation
    nav: {
      home: 'Home',
      dashboard: 'Dashboard',
      calculator: 'ROI Calculator',
      reports: 'Reports',
      sublease: 'Sublease',
    },
    
    // Home page
    home: {
      title: 'Real Estate Investment Analysis',
      subtitle: 'Calculate ROI, analyze cash flow, and make informed investment decisions',
      getStarted: 'Get Started',
      viewDashboard: 'View Dashboard',
      features: {
        title: 'Powerful Investment Analysis Tools',
        roi: {
          title: 'ROI Calculator',
          description: 'Calculate return on investment with detailed financial metrics',
        },
        cashflow: {
          title: 'Cash Flow Analysis',
          description: 'Analyze monthly and annual cash flow projections',
        },
        reports: {
          title: 'Investment Reports',
          description: 'Generate professional reports for your investments',
        },
        sublease: {
          title: 'Sublease Model',
          description: 'Analyze sublease-to-Airbnb profitability',
        },
      },
    },
    
    // Dashboard
    dashboard: {
      title: 'Dashboard',
      subtitle: 'Overview of your property investments',
      totalProperties: 'Total Properties',
      totalCashFlow: 'Total Cash Flow',
      averageROI: 'Average ROI',
      monthlyCashFlow: 'Monthly cash flow',
      returnOnInvestment: 'Return on investment',
      activeInvestments: 'Active investments',
      portfolioPerformance: 'Portfolio Performance',
      monthlyTrends: 'Monthly cash flow and ROI trends',
      propertyRankings: 'Property Rankings',
      sortedByCashFlow: 'Properties sorted by monthly cash flow',
      noProperties: 'No properties found',
      addFirstProperty: 'Add Your First Property',
    },
    
    // ROI Calculator
    roi: {
      title: 'ROI Calculator',
      subtitle: 'Calculate return on investment for your property',
      propertyInfo: 'Property Information',
      purchasePrice: 'Purchase Price',
      downPayment: 'Down Payment',
      monthlyRent: 'Monthly Rent',
      monthlyExpenses: 'Monthly Expenses',
      financing: 'Financing',
      interestRate: 'Interest Rate',
      loanTerm: 'Loan Term (years)',
      operatingExpenses: 'Operating Expenses',
      propertyTax: 'Property Tax (%)',
      insurance: 'Insurance (monthly)',
      hoa: 'HOA (monthly)',
      management: 'Management (%)',
      maintenance: 'Maintenance (%)',
      vacancy: 'Vacancy (%)',
      results: 'Results',
      monthlyCashFlow: 'Monthly Cash Flow',
      annualCashFlow: 'Annual Cash Flow',
      capRate: 'Cap Rate',
      roi: 'ROI',
      calculate: 'Calculate',
      reset: 'Reset',
      share: 'Share',
      export: 'Export',
    },
    
    // Reports
    reports: {
      title: 'Reports',
      subtitle: 'Generate and export investment reports',
      generateReport: 'Generate Report',
      exportPDF: 'Export PDF',
      exportPNG: 'Export PNG',
      exportJSON: 'Export JSON',
      shareLink: 'Share Link',
      propertyAnalysis: 'Property Analysis',
      cashFlow: 'Cash Flow',
      expenseBreakdown: 'Expense Breakdown',
      marketComparison: 'Market Comparison',
    },
    
    // Common
    common: {
      loading: 'Loading...',
      error: 'Error',
      success: 'Success',
      cancel: 'Cancel',
      save: 'Save',
      delete: 'Delete',
      edit: 'Edit',
      view: 'View',
      close: 'Close',
      next: 'Next',
      previous: 'Previous',
      submit: 'Submit',
      back: 'Back',
      continue: 'Continue',
      done: 'Done',
      yes: 'Yes',
      no: 'No',
      ok: 'OK',
      currency: 'USD',
      percentage: '%',
      date: 'Date',
      amount: 'Amount',
      property: 'Property',
      address: 'Address',
      type: 'Type',
      status: 'Status',
    },
    
    // Errors
    errors: {
      somethingWentWrong: 'Something went wrong',
      tryAgain: 'Try Again',
      refreshPage: 'Refresh Page',
      goHome: 'Go Home',
      contactSupport: 'Contact Support',
      invalidInput: 'Invalid input',
      required: 'This field is required',
      minValue: 'Minimum value is {{min}}',
      maxValue: 'Maximum value is {{max}}',
      networkError: 'Network error. Please check your connection.',
      serverError: 'Server error. Please try again later.',
    },
  },
}

// Chinese translations
const zh = {
  translation: {
    // Navigation
    nav: {
      home: '首页',
      dashboard: '仪表板',
      calculator: '投资回报率计算器',
      reports: '报告',
      sublease: '转租',
    },
    
    // Home page
    home: {
      title: '房地产投资分析',
      subtitle: '计算投资回报率，分析现金流，做出明智的投资决策',
      getStarted: '开始使用',
      viewDashboard: '查看仪表板',
      features: {
        title: '强大的投资分析工具',
        roi: {
          title: '投资回报率计算器',
          description: '通过详细的财务指标计算投资回报率',
        },
        cashflow: {
          title: '现金流分析',
          description: '分析月度和年度现金流预测',
        },
        reports: {
          title: '投资报告',
          description: '为您的投资生成专业报告',
        },
        sublease: {
          title: '转租模式',
          description: '分析转租至爱彼迎的盈利能力',
        },
      },
    },
    
    // Dashboard
    dashboard: {
      title: '仪表板',
      subtitle: '您的房地产投资概览',
      totalProperties: '总房产数',
      totalCashFlow: '总现金流',
      averageROI: '平均投资回报率',
      monthlyCashFlow: '月度现金流',
      returnOnInvestment: '投资回报',
      activeInvestments: '活跃投资',
      portfolioPerformance: '投资组合表现',
      monthlyTrends: '月度现金流和投资回报率趋势',
      propertyRankings: '房产排名',
      sortedByCashFlow: '按月度现金流排序的房产',
      noProperties: '未找到房产',
      addFirstProperty: '添加您的第一个房产',
    },
    
    // ROI Calculator
    roi: {
      title: '投资回报率计算器',
      subtitle: '计算您房产的投资回报率',
      propertyInfo: '房产信息',
      purchasePrice: '购买价格',
      downPayment: '首付',
      monthlyRent: '月租金',
      monthlyExpenses: '月支出',
      financing: '融资',
      interestRate: '利率',
      loanTerm: '贷款期限（年）',
      operatingExpenses: '运营费用',
      propertyTax: '房产税 (%)',
      insurance: '保险（月）',
      hoa: '物业费（月）',
      management: '管理费 (%)',
      maintenance: '维护费 (%)',
      vacancy: '空置率 (%)',
      results: '结果',
      monthlyCashFlow: '月度现金流',
      annualCashFlow: '年度现金流',
      capRate: '资本化率',
      roi: '投资回报率',
      calculate: '计算',
      reset: '重置',
      share: '分享',
      export: '导出',
    },
    
    // Reports
    reports: {
      title: '报告',
      subtitle: '生成和导出投资报告',
      generateReport: '生成报告',
      exportPDF: '导出PDF',
      exportPNG: '导出PNG',
      exportJSON: '导出JSON',
      shareLink: '分享链接',
      propertyAnalysis: '房产分析',
      cashFlow: '现金流',
      expenseBreakdown: '费用明细',
      marketComparison: '市场比较',
    },
    
    // Common
    common: {
      loading: '加载中...',
      error: '错误',
      success: '成功',
      cancel: '取消',
      save: '保存',
      delete: '删除',
      edit: '编辑',
      view: '查看',
      close: '关闭',
      next: '下一步',
      previous: '上一步',
      submit: '提交',
      back: '返回',
      continue: '继续',
      done: '完成',
      yes: '是',
      no: '否',
      ok: '确定',
      currency: '美元',
      percentage: '%',
      date: '日期',
      amount: '金额',
      property: '房产',
      address: '地址',
      type: '类型',
      status: '状态',
    },
    
    // Errors
    errors: {
      somethingWentWrong: '出现错误',
      tryAgain: '重试',
      refreshPage: '刷新页面',
      goHome: '返回首页',
      contactSupport: '联系支持',
      invalidInput: '输入无效',
      required: '此字段为必填项',
      minValue: '最小值为 {{min}}',
      maxValue: '最大值为 {{max}}',
      networkError: '网络错误。请检查您的连接。',
      serverError: '服务器错误。请稍后重试。',
    },
  },
}

// Initialize i18n
i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en,
      zh,
    },
    fallbackLng: 'en',
    debug: import.meta.env.MODE === 'development',
    
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
    },
  })

export default i18n