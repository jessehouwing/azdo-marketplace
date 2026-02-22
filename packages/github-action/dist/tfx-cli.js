const path = require("node:path");
const common = require("./tfx/lib/common");
common.APP_ROOT = path.join(__dirname, "tfx");
common.EXEC_PATH = process.argv.slice(2);
require("./tfx/tfx-cli.js");
