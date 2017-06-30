#!/usr/bin/env node

/*

MIT License

Copyright (c) 2017 Peter Dědič

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

*/

const _fs = require('fs');
const _path = require('path');
const _chalk = require('chalk');
const _xml2js = require('xml2js');
// const parser = new xml2js.Parser({explicitArray: false});
const _builder = new _xml2js.Builder( {
			renderOpts: {
				'newline': '\n',
				'indent': '    ',
				'pretty': true
			},
			xmldec: {
				'encoding': 'UTF-8'
			}
		});

let _fileList = '';
let _targetDir = '';

process.argv.forEach((val, index, array) => {
  if (val === '-l') {
  	_fileList = array[index+1];
  }
  if (val === '-d') {
  	_targetDir = array[index+1];
  }
});

console.log(`input parameters: \n ${_chalk.green('list')}: ${_chalk.yellow(_fileList)}\n ${_chalk.green('dir')}:  ${_chalk.yellow(_targetDir)}`);
copyPackage(_fileList, _targetDir);


function copyPackage(fileListFileName, targetDir) {
	const dataTypeMap = JSON.parse(_fs.readFileSync(_path.join(__dirname, 'metaDataTypes.json'), 'utf8'));

	if (targetDir) {

	} else {
		console.log('missing parameter target folder.');
		return;
	}

	let manifest = {
			'Package': {
				'$': {
					'xmlns': 'http://soap.sforce.com/2006/04/metadata'
				},
				'types': [],
				'version': '37.0'
			}
		};

	if (fileListFileName && _fs.existsSync(fileListFileName)) {
		let str = _fs.readFileSync(fileListFileName, 'utf8');
		// console.log(str);
		let list = str.split('\n');


		list.forEach(entry => {
			let fileStatus = entry.substr(0, 1);
			let entryPath = entry.substr(2);
			let filePath = _path.parse(entryPath);
			let entryType = filePath.ext;
			process.stdout.write(_chalk.reset('> '));
			
			if (fileStatus === 'D' || entry === '' || entry.indexOf('meta.xml') > -1) {
				process.stdout.write(_chalk.gray(filePath.base + ' ......skipping\n'));
				return;
			}
			process.stdout.write(filePath.name);

			let metaDataType = dataTypeMap.find(item => {return item.suffix === entryType.substr(1)});
			if (!metaDataType) {
				// console.log(`error: metadata type not found: ${entryType}, ${entry}`);
				process.stdout.write(' [' + _chalk.yellow('not found') + ']');
				// return;
			} else {
				process.stdout.write(' [' + _chalk.magenta(metaDataType.xmlName) + ']');
				let memberName = filePath.name;
				if (metaDataType.inFolder === 'true')
					memberName = _path.join(filePath.dir.split('/').pop(), filePath.name);

				let mType = manifest.Package.types.find(type => {return type.name === metaDataType.xmlName});
				if (mType) {
					mType.members.push(memberName);
				} else {
					mType = {
						members: [memberName],
						name: metaDataType.xmlName
					}
					manifest.Package.types.push(mType);
				}
			}

			// console.log('copying:', entryPath);
			let p = _path.join(targetDir, filePath.dir);
			if (!_fs.existsSync(p)) {
				let tempPath = '';

				p.split('\\').forEach(dSeg => {
					// console.log('dSeg:',dSeg)
					tempPath = _path.join(tempPath, dSeg);
					// console.log('tempPath:',tempPath)
					if(!_fs.existsSync(tempPath))
						_fs.mkdirSync(tempPath);
				});
			}

			let newFile = _path.join(p, filePath.base);
			copySync(entryPath, newFile);
			if (metaDataType && metaDataType.metaFile === 'true') {
				copySync(entryPath + '-meta.xml', newFile + '-meta.xml');
			}
			// console.log('done');
			process.stdout.write(' ......' + _chalk.green('copied'));
			process.stdout.write('\n');
		});

		let xml = _builder.buildObject(manifest);
		_fs.writeFileSync(_path.join(targetDir, 'src', 'package.xml'), xml, 'utf8');

		copySync('build.properties', _path.join(targetDir, 'build.properties'));
		copySync('build.xml', _path.join(targetDir, 'build.xml'));

	} else {
		console.log('file list parameter is missing or doesn\'t exist.');
		return;
	}


	function copySync(src, dest) {
		if (!_fs.existsSync(src)) {
			return false;
		}

		let data = _fs.readFileSync(src, 'utf-8');
		_fs.writeFileSync(dest, data);
	}
}