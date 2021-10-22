const { Resolver } = require("@parcel/plugin");
const path = require("path");
const jsesc = require("jsesc");
const { glob, normalizeSeparators } = require("@parcel/utils");

const PROJECT_ROOT = process.cwd();
const CONFIG_PATH = path.resolve(PROJECT_ROOT, "angular.templates.json");

const loadConfig = async (inputFS) => {
  const defaults = { templates: [], stripPaths: [] };
  const config = {
    ...defaults,
    ...JSON.parse(await inputFS.readFile(CONFIG_PATH)),
  };
  config.stripPaths = config.stripPaths.map((p) => new RegExp(p, "gm"));

  return config;
};

exports.default = new Resolver({
  async resolve({ specifier, options, dependency }) {
    if (specifier !== "templates") return null;

    let config;
    try {
      config = await loadConfig(options.inputFS);
    } catch (e) {
      return {
        invalidateOnFileCreate: [{ filePath: CONFIG_PATH }],
      };
    }

    const { templates, stripPaths } = config;

    const templateGlobs = templates.map((t) => path.resolve(PROJECT_ROOT, t));
    const templateModuleFile = path.resolve(PROJECT_ROOT, "templates.js");

    const templateFiles = await findTemplateFiles(
      templateGlobs,
      options.inputFS
    );

    const templateContents = await getTemplateContents(
      templateFiles,
      options.inputFS,
      stripPaths
    );

    const templateModule = createTemplateModule(templateContents, PROJECT_ROOT);

    return {
      filePath: templateModuleFile,
      code: templateModule,
      canDefer: false,
      invalidateOnFileChange: [...templateFiles, CONFIG_PATH],
      invalidateOnFileCreate: templateGlobs.map((g) => ({ glob: g })),
    };
  },
});

const findTemplateFiles = (templateGlobs, inputFS) =>
  Promise.all(
    templateGlobs.map((templateGlob) => {
      let normalized = normalizeSeparators(templateGlob);
      return glob(normalized, inputFS, {
        onlyFiles: true,
      });
    })
  ).then((foundFiles) => foundFiles.flat());

const getTemplateContents = (templateFiles, inputFS, stripPaths) => {
  return Promise.all(
    templateFiles.map((file) => {
      return inputFS.readFile(file).then((value) => {
        file = file.replace(PROJECT_ROOT, "");

        // Strip out unwanted parts of the path
        stripPaths.forEach((p) => (file = file.replace(p, "")));

        return [file, value];
      });
    })
  );
};

const createTemplateModule = (templateFiles, projectRoot) => {
  const head = `angular.module("templates", []).run(["$templateCache", function ($templateCache) {`;
  const body = templateFiles
    .map(([file, value]) => {
      value = jsesc(value.toString());

      return `$templateCache.put("${file}", '${value}')`;
    })
    .join(";");
  const footer = `}]);`;

  return head + body + footer;
};
