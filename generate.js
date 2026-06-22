const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

const headMatch = html.match(/[\s\S]*?<\/head>/)[0];

let nav = `
  <nav>
    <a href="index.html" class="nav-mark">Usman Ali</a>
    <div class="nav-links">
      <a href="index.html#about">About</a>
      <a href="projects.html">Work</a>
      <a href="index.html#experience">Experience</a>
      <a href="#contact">Contact</a>
    </div>
  </nav>
`;

const workSectionMatch = html.match(/<section id="work"[\s\S]*?<\/section>/)[0];

let workSection = workSectionMatch.replace(/<div style="text-align: center; margin-top: 4rem;" class="reveal">\s*<a href="#" class="btn btn-primary">View Projects<\/a>\s*<\/div>/, '');

const contactSectionMatch = html.match(/<section id="contact"[\s\S]*?<\/section>/)[0];

const footerMatch = html.match(/<footer[\s\S]*?<\/html>/)[0];

let newHtml = headMatch + '\n<body>\n' + nav + '\n' + workSection + '\n' + contactSectionMatch + '\n' + footerMatch;

newHtml = newHtml.replace('<section id="work" class="border-top">', '<section id="work" style="padding-top: 180px;">');
newHtml = newHtml.replace('<span class="num">02</span>\\n\\s*<span class="line"></span>', '<span class="line"></span>');
newHtml = newHtml.replace('<span class="title">Selected Work</span>', '<span class="title">All Projects</span>');
newHtml = newHtml.replace('<title>Muhammad Usman Ali — Backend Software Engineer</title>', '<title>Projects — Muhammad Usman Ali</title>');

fs.writeFileSync('projects.html', newHtml);
