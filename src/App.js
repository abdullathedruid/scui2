import React, {Component} from 'react';
import AppBar from '@material-ui/core/AppBar'
import Typography from '@material-ui/core/Typography'
import Grid from '@material-ui/core/Grid'
import {CardMedia} from '@material-ui/core'

import CreateMarket from './CreateMarket'
import Bets from './Bets'
import Arbitrator from './Arbitrator'

import Web3 from 'web3';
import EventContract from './SCEvent.json'
import ArbitratorContract from './SimpleCentralizedArbitrator.json'
import FactoryContract from './SCFactory.json'

import BigNumber from "bignumber.js"
import ipfsPublish from './ipfs-publish.js'
const ipfs = require("nano-ipfs-store").at("https://ipfs.infura.io:5001");

const enc = new TextEncoder()

class App extends Component {

  constructor() {
    super();
    this.state ={
      account: '',
      event: [],
      arbitrator: null,
      factory: null,
      price: 0,
      matchdata: [],
      endTime: 0,
      resultTime: 0,
      loading: true,
      eventData: [],
      disputeData: [],
      numberOfEvents: 0,
      openBet: false,
      openBetBet: 0,
      openBetOption: 1,
      quotedPrice: 0,
      quotedAmount: 0
    }
    this.addEventData = this.addEventData.bind(this)
  }

  handleCloseBet = (e) => {
    this.setState({openBet: false})
    this.setState({openBetBet: 0})
    this.setState({openBetOption: 1})
  }
  handleOpenBet = (e,b,o) => {
    this.setState({openBet: true})
    this.setState({openBetBet: b})
    this.setState({openBetOption: o})
  }

  handleChangePurchaseSize = (e,bet) => {
    if(e.target.value == 0) {
      this.setState({quotedPrice: 0})
    }
    this.state.event[this.state.openBetBet].methods.price(this.state.openBetOption,new BigNumber(e.target.value*(2**64))).call().then((res) => {
      this.setState({quotedPrice: res/1000000})
    })
    this.setState({quotedAmount: e.target.value})
  }

  async componentDidMount() {
    await this.loadWeb3()
    await this.loadData()
    this.listenForEvents()
  }

  async loadWeb3() {
    if(window.ethereum) {
      window.web3 = new Web3(window.ethereum)
      await window.ethereum.enable()
    } else if (window.web3) {
      window.web3 = new Web3(window.web3.currentProvider)
    } else {
      window.alert('Non-ethereum browser detected. Download metamask!')
    }
  }

  handleCreateMarket = (data,numOptions,endTime,resultTime) => {
    console.log('Attempting to add event: ',numOptions,endTime,resultTime,data)
    ipfs.add(enc.encode(JSON.stringify(data))).then((ipfsHash) => {
      console.log('/ipfs/'+ipfsHash)
      this.state.factory.methods.createMarket(numOptions,endTime,resultTime,'/ipfs/'+ipfsHash).send({from: this.state.account})
      .once('receipt', ((receipt) => {
        try {
          console.log('Market successfully created!!')
        } catch (e) {
          console.log('Error ',e)
        }
      }))
    })

  }

  handlePlaceBet = (e) => {
    console.log(`Attempting to buy ${this.state.quotedAmount} shares on option [${this.state.openBetOption}] on event: ${this.state.eventData[this.state.openBetBet].title} at address ${this.state.event[this.state.openBetBet]._address}`)
    try{
      this.state.event[this.state.openBetBet].methods.buyshares(this.state.openBetOption,new BigNumber(this.state.quotedAmount*(2**64))).send({from: this.state.account})
      .once('receipt', ((receipt) => {
        console.log('Placed Bet!')
        this.setState({openBet: false})
      }))
    } catch (err) {
      console.log('Error', err)
    }
  }

  addEventData (address,title,description,question,options,endTime,resultTime, outcome, price, balances, state) {
    var obj = {
      address: address,
      title: title,
      description: description,
      question: question,
      options: options,
      endTime: endTime,
      resultTime: resultTime,
      outcome: outcome,
      price: price,
      balances: balances,
      state: state
    }
    this.setState({eventData: [...this.state.eventData, obj]})
  }

  getEventData(address) {
    this.state.eventData.map((ev,key) => {
      if(ev.address == address) {
        return 'test'
      } else {
      }
    })
  }

  addDisputeData(data) {
    var obj = {
      arbitrated: data[0],
      choices: data[1],
      ruling: data[2],
      status: data[3],
      eventData: null
    }
    this.setState({disputeData: [...this.state.disputeData, obj]})
  }

  async loadData() {
    const web3 = window.web3
    const accounts = await web3.eth.getAccounts()
    this.setState({account: accounts[0]})

    const factory = new web3.eth.Contract(FactoryContract.abi, '0x8d6BCB6aB8A24D07cF0838F919939434A878F11e')
    this.setState({factory})
    const numEvents = await factory.methods.getNumberOfMarkets().call()
    this.setState({numberOfEvents: numEvents})
    const arbitrator = new web3.eth.Contract(ArbitratorContract.abi,'0x6E06EBb39Fdf15539d06227b51C96A31d4A249b4')
    this.setState({arbitrator})

    for(var i=0;i<numEvents;i++) {
      var addr = await factory.methods.getMarket(i).call()
      var ev = new web3.eth.Contract(EventContract.abi, addr)
      this.setState({event: [...this.state.event,ev]})

      var numOptions = await ev.methods.numOfOutcomes().call()
      var price = []
      var balances = []
      for (var j=0; j<numOptions; j++) {
        price[j] = (await ev.methods.price(j+1,new BigNumber(18446744073709551616)).call()/1000000).toFixed(2)
        balances[j] = (await ev.methods.getBalanceOf(j+1,this.state.account).call())/(2**64)
      }

      var outcome = await ev.methods.getOutcome().call()
      var endTime = await ev.methods.endTimestamp().call()
      var resultTime = await ev.methods.resultTimestamp().call()

      var state = await ev.methods.status().call()

      var metaevidence
      await ev.getPastEvents('MetaEvidence', {fromBlock: 0, toBlock: 'latest'})
      .then((evx) => {
        metaevidence = evx[0].returnValues._evidence;
        console.log('Loading file: ',metaevidence)
        var output = fetch('https://gateway.ipfs.io'+metaevidence)
        .then((response) => response.json())
        .then((responseJSON) => {
          this.addEventData(ev._address,responseJSON.title, responseJSON.description, responseJSON.question, responseJSON.rulingOptions.descriptions,endTime,resultTime,outcome,price,balances,state)
          console.log('Finished loading: ',metaevidence);
          console.log(i,numEvents)
          if(i>=(numEvents-1)) {
            console.log('loaded all data')
            this.setState({loading: false})
          }
        })
      })

      var arb_data = await arbitrator.methods.getDisputeData(1).call()
      this.addDisputeData(arb_data)



    }
  }

  listenForEvents = () => {
    /*if(this.state.loading == false) {
    //console.log('address',this.state.event[0].events)
    this.state.event[0].events.MetaEvidence({}).on('data',(event,error) => {
      console.log(event,error)
    })
  }
    //contract.DisputeCreate({}).on('data', (event,error) => {})*/
  }

  render() {
    if(this.state.loading == false ){
    return(
      <React.Fragment>
      <header>
        <AppBar position="static" style = {{backgroundColor: "#ED1C24"}} >
          <img style={{ width: "50%" }} src="supreme_header.png" />
          <Typography variant="h6" color="inherit" noWrap>
            Your address: {this.state.account}
            </Typography>
            </AppBar>
      </header>
    <main>
    <br/>
    <Grid container spacing = {3}>

      <Grid item xs={4}>
        <CreateMarket createMarket={this.handleCreateMarket} state={this.state}/>
      </Grid>
      <Grid item xs={4}>
        <Bets handlePlaceBet={this.handlePlaceBet} handleChangePurchaseSize={this.handleChangePurchaseSize} state={this.state} open={this.state.openBet} handleClose={this.handleCloseBet} handleOpen={this.handleOpenBet}/>
      </Grid>
      <Grid item xs={4}>
        <Arbitrator state={this.state}/>
      </Grid>
    </Grid>
    </main>
    </React.Fragment>
  )} else {
    return(
    <div>
    loading
    </div>
    )
    }
  }
}

export default App;
