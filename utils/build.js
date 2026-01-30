/*
    Build script. Generates:
        - TamperMonkey Google-images-subversion version of imgRef 
*/

const fs = require('fs');
//const path = require('path');


const template = fs.readFileSync('resources/tamperMonkey-imgRef.template', 'utf8');             // read TamperMonkey template
const imgRef = fs.readFileSync('imgRef.htm', 'utf8');                                           // read source file


const styles = imgRef.match(/<!-- start STYLE -->([\s\S]*?)<!-- end STYLE -->/)[1]              // extract styles
                     .trim()
                     .replaceAll(/^\s*\/\*[\s\S]*?\*\/\s*\n/gm, '');                            // remove comments;

const ui = imgRef.match(/<!-- start UI -->([\s\S]*?)<!-- end UI -->/)[1]                        // extract UI
                 .trim() 
                 .replaceAll(/^\s*<!--[\s\S]*?-->\s*\n/gm, '');                                 // remove comments;

const script = imgRef.match(/\/\/ start SCRIPT ---([\s\S]*?)\/\/ end SCRIPT ---/)[1]            // extract script
                 .trim() 
                 .replaceAll(/^\s*\/\/[\s\S]*?\n/gm, '');                                       // remove comments;


const output = template
                    .replace('{{VERSION}}', new Date().toISOString().replace(/T.*$/, ''))       // insert version date
                    .replace('{{STYLE}}', styles)                                               // insert styles
                    .replace('{{UI}}', ui)                                                      // insert UI
                    .replace('{{SCRIPT}}', script);                                             // insert script

// .replace('{{SCRIPTS}}', scripts)
// .replace('{{INIT}}', typeSpecific);


fs.writeFileSync(`imgRef-tampermonkey.js`, output);                                             // write output
console.log(`✓ Built imgRef-tampermonkey.js`);