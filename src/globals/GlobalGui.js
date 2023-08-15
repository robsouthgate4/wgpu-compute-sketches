import GUI from "lil-gui";

export default class GlobalGui extends GUI {
  constructor() {
    super();
    this.instance = null;
  }
  static getInstance() {
    if (!GlobalGui.instance) GlobalGui.instance = new this();
    return GlobalGui.instance;
  }

  dispose() {
    this.close();
    this.destroy();
    delete GlobalGui.instance;
  }
}
