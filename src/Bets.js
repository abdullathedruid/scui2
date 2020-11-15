import React, {Component} from 'react';
import Accordion from '@material-ui/core/Accordion';
import AccordionSummary from '@material-ui/core/AccordionSummary';
import AccordionDetails from '@material-ui/core/AccordionDetails';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import Container from '@material-ui/core/Container'
import Typography from '@material-ui/core/Typography'
import Button from '@material-ui/core/Button'
import {List, ListItem} from '@material-ui/core'
import CardMedia from '@material-ui/core/CardMedia'
import Dialog from '@material-ui/core/Dialog'
import DialogTitle from '@material-ui/core/DialogTitle'
import TextField from '@material-ui/core/TextField'

const months = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC']

function returnFormattedTime(unix) {
  var date = new Date(unix*1000)
  var day = date.getDate()
  var month = months[date.getMonth()]
  var year = date.getFullYear()
  var hours = date.getHours()
  var mins = (date.getMinutes()<10?'0'+date.getMinutes():date.getMinutes())
  var secs = (date.getSeconds()<10?'0'+date.getSeconds():date.getSeconds())
  return day+" "+month+" "+year+" "+hours+":"+mins+":"+secs+" (UTC)"
}


class BetCard extends Component {
  constructor(props) {
    super()
    this.state = {
      openBet: true,
      currentBet: 0
    }
  }

  renderOutcome(resultTime,outcome) {
    let timestamp = (Date.now())/1000
    if(timestamp > resultTime) {
      return(<Typography> Outcome: {outcome} </Typography>)
    } else {
      return ''
    }
  }

  renderSetOutcome(resultTime) {
    let timestamp = (Date.now())/1000
    if(timestamp > resultTime) {
      return(<Button>Set Outcome (only GAMEMASTER)</Button>)
    } else {
      return ''
    }
  }

  renderDisputeAnswer(resultTime) {
    let timestamp = (Date.now())/1000
    if(timestamp > resultTime) {
      return(<Button>Dispute Answer</Button>)
    } else {
      return ''
    }
  }

  renderClaimReward(state) {
    if(state == 4) {
      return(<Button>Claim reward</Button>)
    } else {
      return ''
    }
  }

  handleOpen = (e) => {
    this.props.handleOpen(e,this.props.id,1+parseInt(e.target.id))
  }

  render() {
    var eventData = this.props.state.eventData[this.props.id]
    var timestamp = (Date.now())/1000
    return(
      <div>
      <Typography>{eventData.description}</Typography>
      <List>
      {
        eventData.options.map((option,key) => {
          return(
            <ListItem button id={key} onClick={this.handleOpen}>{eventData.options[key]}: {eventData.price[key]}   [{eventData.balances[key]} shares owned]</ListItem>
          )
        })
      }
      </List>
      {this.renderOutcome(eventData.resultTime,eventData.outcome)}
      <Typography>Betting finishes: {returnFormattedTime(eventData.endTime)}</Typography>
      <Typography>Answer revealed: {returnFormattedTime(eventData.resultTime)}</Typography>
      {this.renderSetOutcome(eventData.resultTime)}
      {this.renderDisputeAnswer(eventData.resultTime)}
      {this.renderClaimReward(eventData.state)}
      </div>
    )
  }
}

class Bets extends Component {
  constructor(props) {
    super()
  }

  handleClose = (e) => {
    this.props.handleClose()
  }

  render() {
    return(
      <Container>
      <Dialog scroll='body' onClose={this.handleClose} open={this.props.open}>
      <DialogTitle> Place Bet </DialogTitle>
        <Typography>{this.props.state.eventData[this.props.state.openBetBet].title}</Typography>
        <Typography>You have chosen: {this.props.state.eventData[this.props.state.openBetBet].options[this.props.state.openBetOption-1]}</Typography>
        <form>
          <TextField fullWidth label="How many shares to buy?" onChange={this.props.handleChangePurchaseSize}/>
          <TextField fullWidth label="Price" value={this.props.state.quotedPrice} />
          <Button> Submit </Button>
        </form>

      </Dialog>
      <img style={{ width: "100%"}} src="active_markets.png" />
      <CardMedia style={{ height: "200px" }} image="/market2.jpg" />
      <div>
      {
        this.props.state.eventData.map((bet,key) => {
          return(
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}> {this.props.state.eventData[key].title} </AccordionSummary>
              <AccordionDetails> <BetCard id={key} state={this.props.state} handleOpen={this.props.handleOpen} /> </AccordionDetails>
            </Accordion>
          )
        })
      }
      </div>
      </Container>
    )
  }
}

export default Bets
