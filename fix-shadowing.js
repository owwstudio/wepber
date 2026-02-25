const fs = require('fs');
const file = 'src/app/api/scan/route.ts';
let code = fs.readFileSync(file, 'utf-8');

const replacements = [
    { from: /const seoScore = /g, to: 'seoScore = ' },
    { from: /const seoResult: SEOResult = /g, to: 'seoResult = ' },
    { from: /const headingScore = /g, to: 'headingScore = ' },
    { from: /const headingResult: HeadingResult = /g, to: 'headingResult = ' },
    { from: /const imageScore = /g, to: 'imageScore = ' },
    { from: /const imageResult: ImageResult = /g, to: 'imageResult = ' },
    { from: /const linkScore = /g, to: 'linkScore = ' },
    { from: /const linkResult: LinkResult = /g, to: 'linkResult = ' },
    { from: /const visualScore = /g, to: 'visualScore = ' },
    { from: /const visualResult: VisualResult = /g, to: 'visualResult = ' },
    { from: /const perfScore = /g, to: 'perfScore = ' },
    { from: /const performanceResult: PerformanceResult = /g, to: 'performanceResult = ' },
    { from: /const a11yScore = /g, to: 'a11yScore = ' },
    { from: /const accessibilityResult: AccessibilityResult = /g, to: 'accessibilityResult = ' },
    { from: /let responsiveScore = /g, to: 'responsiveScore = ' },
    { from: /const responsiveResult: ResponsiveResult = /g, to: 'responsiveResult = ' },
    { from: /let securityScore = /g, to: 'securityScore = ' },
    { from: /const securityResult: SecurityResult = /g, to: 'securityResult = ' },
    { from: /const techStackResult: TechStackResult = /g, to: 'techStackResult = ' }
];

replacements.forEach(({ from, to }) => {
    code = code.replace(from, to);
});

fs.writeFileSync(file, code);
console.log('Fixed variable shadowing in route.ts');
