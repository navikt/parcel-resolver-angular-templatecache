const { Resolver } = require("@parcel/plugin");
const path = require("path");
const nullthrows = require("nullthrows");
const jsesc = require("jsesc");
const { glob, normalizeSeparators } = require("@parcel/utils");

exports.default = new Resolver({
  async resolve({ specifier, options, dependency }) {
    if (specifier !== "templates") return null;

    // This or options.projectRoot directly?
    const projectRoot = path.dirname(
      nullthrows(dependency.resolveFrom ?? dependency.sourcePath)
    );

    // Should come from a config somehow
    let templateGlobs = [
      "../../views/**/*.html",
      "../../../node_modules/@navikt/**/*.html",
    ];

    const templateFile = path.resolve(__dirname, "templates.js");

    try {
      const templateFiles = await findTemplateFiles(
        templateGlobs,
        projectRoot,
        options.inputFS
      );

      const templateContents = await getTemplateContents(
        templateFiles,
        options.inputFS
      );

      const templateModule = createTemplateModule(
        templateContents,
        projectRoot
      );

      return {
        filePath: templateFile,
        code: templateModule,
        invalidateOnFileChange: templateFiles,
      };
    } catch (err) {
      return {
        invalidateOnFileCreate: [{ filePath: templateFile }],
      };
    }
  },
});

const getTemplateContents = (templateFiles, inputFS) =>
  Promise.all(
    templateFiles.map((file) =>
      inputFS.readFile(file).then((value) => [file, value])
    )
  );

const createTemplateModule = (templateFiles, projectRoot) => {
  const head = `angular.module("templates", []).run(["$templateCache", function ($templateCache) {`;
  const body = templateFiles
    .map(([file, value]) => {
      file = file.replace(projectRoot, "");
      value = jsesc(value.toString());

      return `$templateCache.put("${file}", '${value}')`;
    })
    .join(";");
  const footer = `}]);`;

  return head + body + footer;
};
const findTemplateFiles = (templateGlobs, projectRoot, inputFS) =>
  Promise.all(
    templateGlobs.map((templateGlob) => {
      templateGlob = path.resolve(projectRoot, templateGlob);

      let normalized = normalizeSeparators(templateGlob);
      return glob(normalized, inputFS, {
        onlyFiles: true,
      });
    })
  ).then((foundFiles) => foundFiles.flat());
