module.exports = {
  dependency: {
    platforms: {
      android: {
        sourceDir: './android',
        packageImportPath: 'import com.googlesigninmodern.GoogleSigninModernPackage;',
      },
    },
  },
  codegenConfig: {
    name: 'GoogleSigninModernSpec',
    type: 'modules',
    jsSrcsDir: './src',
    android: {
      javaPackageName: 'com.googlesigninmodern',
    },
  },
};
