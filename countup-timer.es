// similar to CountdownTimer in 'views/components/main/parts/countdown-timer.es', but it counts up

import React, { Component, PropTypes } from 'react'

import { resolveTime } from 'views/utils/tools'


export class CountupTimer extends Component {
  constructor(props) {
    super(props)
    this.timeElapsed = this.constructor.getTimeElapsed(this.props.startTime)
  }
  static getTimeElapsed = (startTime, currentTime=Date.now()) => {
    if (startTime <= 0) {
      return -1
    } else if ( startTime > currentTime) {
      return 0
    } else {
      return Math.round((currentTime - startTime) / 1000)
    }
  }
  static propTypes = {
    countdownId: PropTypes.string.isRequired, // UNIQUE ID to register to window.ticker
    startTime: PropTypes.number, // startTime in ms
    tickCallback: PropTypes.func, // callback function for each second
    startCallback: PropTypes.func, // callback function when starting to count up
  }
  defaultProps = {
    startTime: -1,
    tickCallback: null,
    startCallback: null,
  }
  state = {
    startTime: this.props.startTime,
  }
  componentDidMount = () => {
    this.startTick()
  }
  componentWillReceiveProps = (nextProps) => {
    if (nextProps.countdownId !== this.props.countdownId) {
      this.stopTick()
    }
    if (nextProps.startTime !== this.state.startTime) {
      this.setState({startTime: nextProps.startTime})
      this.timeElapsed = this.constructor.getTimeElapsed(nextProps.startTime)
    }
  }
  shouldComponentUpdate = (nextProps, nextState) =>
    nextProps.countdownId !== this.props.countdownId || nextState.startTime !== this.state.startTime
  componentDidUpdate = () => {
    this.startTick() // Doesn't matter if it didn't stop
  }
  componentWillUnmount = () => {
    this.stopTick()
  }
  startTick = () => {
    window.ticker.reg(this.props.countdownId, this.tick)
  }
  stopTick = () => {
    window.ticker.unreg(this.props.countdownId)
  }
  tick = (currentTime) => {
    // const actualElapsed = this.constructor.getTimeElapsed(this.state.startTime, currentTime)
    // if (Math.abs(this.timeElapsed - actualElapsed) > 2) {
    //   this.timeElapsed = actualElapsed
    // }
    this.timeElapsed = this.constructor.getTimeElapsed(this.state.startTime, currentTime)
    if (this.timeElapsed < 0) {
      this.stopTick()
    }
    if (this.state.startTime >= 0)
      try {
        if (this.textLabel) {
          this.textLabel.textContent = resolveTime(this.timeElapsed) || 'Not Refreshed'
        }
        if (this.props.tickCallback) {
          this.props.tickCallback(this.timeElapsed)
        }
        if (this.timeElapsed < 1 && this.props.startCallback) {
          this.props.startCallback()
        }
      } catch (error) {
        console.error(error.stack)
      }
    this.timeElapsed += 1
  }
  render() {
    return <span ref={(ref) => {this.textLabel = ref}}>{resolveTime(this.timeElapsed)}</span>
  }
}
