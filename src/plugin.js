import videojs from 'video.js';
import {version as VERSION} from '../package.json';
import ConcreteButton from './ConcreteButton';
import ConcreteMenuItem from './ConcreteMenuItem';

// const Plugin = videojs.getPlugin('plugin');

// Default options for the plugin.
const defaults = {
  vjsIconClass: 'vjs-icon-hd',
  displayCurrentQuality: false,
  placementIndex: 0
};

/**
 * An advanced Video.js plugin. For more information on the API
 *
 * See: https://blog.videojs.com/feature-spotlight-advanced-plugins/
 */
class QualitySelectorHlsClass {

  /**
   * Create a QualitySelectorHls plugin instance.
   *
   * @param  {Player} player
   *         A Video.js Player instance.
   *
   * @param  {Object} [options]
   *         An optional options object.
   *
   *         While not a core part of the Video.js plugin architecture, a
   *         second argument of options is a convenient way to accept inputs
   *         from your plugin's caller.
   */
  constructor(player, options) {
    // the parent class will add player under this.player
    this.player = player;
    this.config = videojs.obj.merge(defaults, options);

    player.ready(() => {
      this.player.addClass('vjs-quality-selector-hls');

      if (this.player.qualityLevels) {
        // Create the quality button.
        this.createQualityButton();
        this.bindPlayerEvents();
      }
    });
  }

  /**
   * Returns HLS Plugin
   *
   * @return {*} - videojs-hls-contrib plugin.
   */
  getHls() {
    return this.player.tech({ IWillNotUseThisInPlugins: true }).hls;
  }
  /**
   * Binds listener for quality level changes.
   */
  bindPlayerEvents() {
    this.player.qualityLevels().on('addqualitylevel', this.onAddQualityLevel.bind(this));
  }
  /**
   * Adds the quality menu button to the player control bar.
   */
  createQualityButton() {

    const player = this.player;

    this._qualityButton = new ConcreteButton(player);

    const placementIndex = player.controlBar.children().length - 2;
    const concreteButtonInstance = player.controlBar.addChild(
      this._qualityButton,
      { componentClass: 'qualitySelector' },
      this.config.placementIndex || placementIndex
    );

    concreteButtonInstance.addClass('vjs-quality-selector');

    if (!this.config.displayCurrentQuality) {
      const icon = ` ${this.config.vjsIconClass || 'vjs-icon-hd'}`;

      concreteButtonInstance
        .menuButton_.$('.vjs-icon-placeholder').className += icon;
    } else {
      this.setButtonInnerText('auto');
    }
    concreteButtonInstance.removeClass('vjs-hidden');
  }
  /**
  *Set inner button text.
  *
  * @param {string} text - the text to display in the button.
  */
  setButtonInnerText(text) {
    this._qualityButton
      .menuButton_.$('.vjs-icon-placeholder').innerHTML = text;
  }

  /**
   * Builds individual quality menu items.
   *
   * @param {Object} item - Individual quality menu item.
   * @return {ConcreteMenuItem} - Menu item
   */
  getQualityMenuItem(item) {
    const player = this.player;

    return ConcreteMenuItem(player, item, this._qualityButton, this);
  }

  /**
   * Executed when a quality level is added from HLS playlist.
   */
  onAddQualityLevel() {

    const player = this.player;
    const qualityList = player.qualityLevels();
    const levels = qualityList.levels_ || [];
    const levelItems = [];

    for (let i = 0; i < levels.length; ++i) {
      const {width, height, bitrate} = levels[i];
      let pixels,bitrate_;
      if(width && height) {
        pixels = width > height ? height : width;
      }
      else if(bitrate) {
        bitrate_ = bitrate;
      }

      if (!pixels) {
        continue;
      }

      if (!bitrate_) {
        continue;
      }

      if (!levelItems.filter(_existingItem => {
        return _existingItem.item && (_existingItem.item.value === pixels || _existingItem.item.value === bitrate_);
      }).length) {
        let levelItem;
        if(pixels){
          levelItem = this.getQualityMenuItem.call(this, {
            label: pixels + 'p',
            value: pixels
          });
        }else{
          levelItem = this.getQualityMenuItem.call(this, {
            label: bitrate_/1000 + 'Kbps',
            value: bitrate_
          });
        }

        levelItems.push(levelItem);
      }
    }

    levelItems.sort((current, next) => {
      if ((typeof current !== 'object') || (typeof next !== 'object')) {
        return -1;
      }
      if (current.item.value < next.item.value) {
        return -1;
      }
      if (current.item.value > next.item.value) {
        return 1;
      }
      return 0;
    });

    levelItems.push(this.getQualityMenuItem.call(this, {
      label: player.localize('Auto'),
      value: 'auto',
      selected: true
    }));

    if (this._qualityButton) {
      this._qualityButton.createItems = function() {
        return levelItems;
      };
      this._qualityButton.update();
    }

  }

  /**
   * Sets quality (based on media short side)
   *
   * @param {number} quality - A number representing HLS playlist.
   */
  setQuality(quality) {
    const qualityList = this.player.qualityLevels();

    // Set quality on plugin
    this._currentQuality = quality;

    if (this.config.displayCurrentQuality) {
      this.setButtonInnerText(quality === 'auto' ? quality : `${quality}p`);
    }

    for (let i = 0; i < qualityList.length; ++i) {
      const {width, height} = qualityList[i];
      const pixels = width > height ? height : width;

      qualityList[i].enabled = (pixels === quality || quality === 'auto');
    }
    this._qualityButton.unpressButton();
  }

  /**
   * Return the current set quality or 'auto'
   *
   * @return {string} the currently set quality
   */
  getCurrentQuality() {
    return this._currentQuality || 'auto';
  }

}

const initPlugin = function(player, options) {
  const QualitySelectorHls = new QualitySelectorHlsClass(player, options);

  player.QualitySelectorHlsVjs = true;
  // Define default values for the plugin's `state` object here.
  QualitySelectorHls.defaultState = {};

  // Include the version number.
  QualitySelectorHls.VERSION = VERSION;

  return QualitySelectorHls;
};

const QualitySelectorHls = function(options) {
  return initPlugin(this, videojs.obj.merge({}, options));
};

// Register the plugin with video.js.
videojs.registerPlugin('qualitySelectorHls', QualitySelectorHls);

export default QualitySelectorHls;
