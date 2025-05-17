const { Plugin } = require('obsidian');

class VersionBump {
  constructor() {
    this.manifest = require('./manifest.json');
    this.versions = require('./versions.json');
  }

  bumpVersion() {
    const currentVersion = this.manifest.version;
    const [major, minor, patch] = currentVersion.split('.').map(Number);
    
    // 增加补丁版本号
    const newVersion = `${major}.${minor}.${patch + 1}`;
    
    // 更新 manifest.json
    this.manifest.version = newVersion;
    require('fs').writeFileSync('./manifest.json', JSON.stringify(this.manifest, null, 2));
    
    // 更新 versions.json
    this.versions[newVersion] = this.manifest.minAppVersion;
    require('fs').writeFileSync('./versions.json', JSON.stringify(this.versions, null, 2));
    
    console.log(`版本已从 ${currentVersion} 更新到 ${newVersion}`);
  }
}

new VersionBump().bumpVersion();
