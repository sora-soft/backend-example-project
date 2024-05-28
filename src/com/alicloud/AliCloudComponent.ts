import {Component, FrameworkError, FrameworkErrorCode, IComponentOptions} from '@sora-soft/framework';
import {TypeGuard} from '@sora-soft/type-guard';
import {AliCloudError, AliCloudErrorCode} from './AliCloudError.js';
import {AliCloudPop, IAliCloudPopConfig} from './AliCloudPop.js';
import {IAliCloudCommonConfig} from './AliCloudType.js';
import {AliCloudOSS, IAliCloudOSSConfig} from './AliCloudOSS.js';
import {AliCloudGreenCip, IAliCloudGreenCipConfig} from './AliGreenCip.js';
import {AliCloudCDN, IAliCloudCDNConfig} from './AliCloudCDN.js';

export interface IAliCloudComponentOptions extends IComponentOptions, IAliCloudCommonConfig {
  pop?: IAliCloudPopConfig;
  oss?: IAliCloudOSSConfig;
  greenCip?: IAliCloudGreenCipConfig;
  cdn?: IAliCloudCDNConfig;
}

class AliCloudComponent extends Component {
  protected setOptions(options: IAliCloudComponentOptions) {
    TypeGuard.assert<IAliCloudComponentOptions>(options);
    this.aliCloudOptions_ = options;
  }

  protected async connect() {
    if (!this.aliCloudOptions_)
      throw new FrameworkError(FrameworkErrorCode.ERR_COMPONENT_OPTIONS_NOT_SET, 'ERR_COMPONENT_OPTIONS_NOT_SET');


    const aliConfig: IAliCloudCommonConfig = {
      accessKeyId: this.aliCloudOptions_.accessKeyId,
      accessKeySecret: this.aliCloudOptions_.accessKeySecret,
    };

    if (this.aliCloudOptions_.pop) {
      this.pop_ = new AliCloudPop(aliConfig, this.aliCloudOptions_.pop);
    }

    if (this.aliCloudOptions_.oss) {
      this.oss_ = new AliCloudOSS(aliConfig, this.aliCloudOptions_.oss);
    }

    if (this.aliCloudOptions_.greenCip) {
      this.greenCip_ = new AliCloudGreenCip(aliConfig, this.aliCloudOptions_.greenCip);
    }

    if (this.aliCloudOptions_.cdn) {
      this.cdn_ = new AliCloudCDN(aliConfig, this.aliCloudOptions_.cdn);
    }
  }

  protected async disconnect() {
  }

  get pop() {
    if (!this.pop_)
      throw new AliCloudError(AliCloudErrorCode.ERR_SUB_NOT_LOADED, 'ERR_SUB_NOT_LOADED, module=pop');

    return this.pop_;
  }

  get oss() {
    if (!this.oss_)
      throw new AliCloudError(AliCloudErrorCode.ERR_SUB_NOT_LOADED, 'ERR_SUB_NOT_LOADED, module=oss');

    return this.oss_;
  }

  get greenCip() {
    if (!this.greenCip_)
      throw new AliCloudError(AliCloudErrorCode.ERR_SUB_NOT_LOADED, 'ERR_SUB_NOT_LOADED, module=green-cip');

    return this.greenCip_;
  }

  get cdn() {
    if (!this.cdn_)
      throw new AliCloudError(AliCloudErrorCode.ERR_SUB_NOT_LOADED, 'ERR_SUB_NOT_LOADED, module=cdn');

    return this.cdn_;
  }

  get version() {
    return '0.0.0';
  }

  private aliCloudOptions_?: IAliCloudComponentOptions;
  private pop_?: AliCloudPop;
  private oss_?: AliCloudOSS;
  private greenCip_?: AliCloudGreenCip;
  private cdn_?: AliCloudCDN;
}

export {AliCloudComponent};
