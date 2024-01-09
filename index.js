const express = require("express");
const app = express();
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const e = require("express");

app.use(cors());
app.get("/", (req, res) => {
  res.send("I am the Mafia Server");
});
const server = http.createServer(app);


const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

const rooms = {};
const gameState={};
const Cards={};


io.on("connection", (socket) => {
  console.log(`User Connected: ${socket.id}`);

  socket.on("join_room", (data) => {



    const { room, playerName } = data;


    var isHost = false;	
    // Create the room if it doesn't exist
    if (!rooms[room]) {
      rooms[room] = [];
      io.to(socket.id).emit("room_created", room);
      isHost = true;
    }
    if(gameState[room]==="started" || rooms[room].length===4){
     
      socket.emit("room_full");
    }
    // Add the player to the room
   else{
    
     rooms[room].push({ id: socket.id, name: playerName,isHost:isHost,playernumber:rooms[room].length,isTurn:false,isHighest:false,cardsCount:0,playedCard:-1,playedHouse:''});
     console.log(rooms[room]);
    // Notify other clients about the updated player list
    io.to(room).emit("update_players", rooms[room]);
    io.emit("update_players", rooms[room]);
   
    // Join the room
    socket.join(room);

    // Broadcast a message to the room when a player joins
    io.to(room).emit("receive_message", {
      playerName: "System",
      message: `${playerName} has joined the room.`,
    });

    io.to(room).emit("update_players", rooms[room]);


  }
 

  });

  

  socket.on("send_message", (data) => {
    console.log(data);
    socket.to(data.room).emit("receive_message", data);
  });



  socket.on("start_game", (room) => {
    console.log("Game Started");

    // Set game state to started
    gameState[room] = "started";

    // Distribution of 52 playing cards to 4 players using 1-52 random number generator
    const cards = Array.from({ length: 52 }, (_, i) => i);
    var temp_cards = { p1: [], p2: [], p3: [], p4: [] };

    for (let i = 0; i < 13; i++) {
        temp_cards.p1.push(cards.splice(Math.floor(Math.random() * cards.length), 1)[0]);
        temp_cards.p2.push(cards.splice(Math.floor(Math.random() * cards.length), 1)[0]);
        temp_cards.p3.push(cards.splice(Math.floor(Math.random() * cards.length), 1)[0]);
        temp_cards.p4.push(cards.splice(Math.floor(Math.random() * cards.length), 1)[0]);
    }


    // Sort the cards arrays for each player
    temp_cards.p1.sort((a, b) => a - b);
    temp_cards.p2.sort((a, b) => a - b);
    temp_cards.p3.sort((a, b) => a - b);
    temp_cards.p4.sort((a, b) => a - b);

    // Assign the cards to the room
    Cards[room] = temp_cards;

    // Log the generated cards for debugging
    console.log("Generated Cards:", Cards[room]);

    // Finding turns based on card '49'
    rooms[room].forEach((player, index) => {
        player.isTurn = Cards[room][`p${index + 1}`].includes(49);
        player.cardsCount = 13;
    });

    // Sending cards to players
    io.to(rooms[room][0].id).emit("cards", Cards[room].p1);
    io.to(rooms[room][1].id).emit("cards", Cards[room].p2);
    io.to(rooms[room][2].id).emit("cards", Cards[room].p3);
    io.to(rooms[room][3].id).emit("cards", Cards[room].p4);

    // Sending turns to players
    io.to(room).emit("update_players", rooms[room]);
    io.emit("update_players", rooms[room]);

    // Sending game state to players
    io.to(room).emit("game_started", gameState[room]);
    io.emit("game_started", gameState[room]);
});


 
socket.on("play_card", (data) => {

console.log('played a card');
console.log(data);

    const { room, playerId,card } = data;


    //delete the card from the player's cards

    if(playerId===rooms[room][0].id){
      Cards[room].p1.splice(Cards[room].p1.indexOf(card),1);
      rooms[room][0].playedCard=card;
      rooms[room][0].isTurn=false;
   
    }
    else if(playerId===rooms[room][1].id){
      Cards[room].p2.splice(Cards[room].p2.indexOf(card),1);
        rooms[room][1].playedCard=card;
        rooms[room][1].isTurn=false;
      
    }
    else if(playerId===rooms[room][2].id){
      Cards[room].p3.splice(Cards[room].p3.indexOf(card),1);
        rooms[room][2].playedCard=card;
        rooms[room][2].isTurn=false;
        

    }
    else if(playerId===rooms[room][3].id){
      Cards[room].p4.splice(Cards[room].p4.indexOf(card),1);
        rooms[room][3].playedCard=card;
        rooms[room][3].isTurn=false;
   
    }

    //sending cards to players
    io.to(rooms[room][0].id).emit("cards",Cards[room].p1.sort());
    io.to(rooms[room][1].id).emit("cards",Cards[room].p2.sort());
    io.to(rooms[room][2].id).emit("cards",Cards[room].p3.sort());
    io.to(rooms[room][3].id).emit("cards",Cards[room].p4.sort());

    //updating cards count  each player
    rooms[room][0].cardsCount=Cards[room].p1.length;
    rooms[room][1].cardsCount=Cards[room].p2.length;
    rooms[room][2].cardsCount=Cards[room].p3.length;
    rooms[room][3].cardsCount=Cards[room].p4.length;

    //sending updated players to players
    io.to(room).emit("update_players", rooms[room]);
    io.emit("update_players", rooms[room]);

    //sending played house to players
    var cardHouse='';
    if(card>=0 && card<=12){
        cardHouse='hearts';
    }
    else if(card>=13 && card<=25){
        cardHouse='clubs';
    }
    else if(card>=26 && card<=38){
        cardHouse='diamonds';
    }
    else if(card>=39 && card<=51){
        cardHouse='spades';
    }
    io.to(room).emit("played_house", cardHouse);

    //check if current played card is of different house then its previous card

    //get the index of the player who played the card
    var playerIndex=rooms[room].findIndex((player) => player.id === playerId);

    //get the index of the player who played the previous card
    //need to check if the previous player has played any card or not and if he has played then only we can get his index else we will check previous to previous player
    var previousPlayerIndex=-1;
   // Traverse elements in a reverse circular manner
   for (let i = 1; i < 4; i++) {
    const index = (playerIndex - i + 4) % 4;
    if(rooms[room][index].playedCard!==-1){
        previousPlayerIndex=index;
        break;
    }
    
}




    var previousCardHouse='';
    if(previousPlayerIndex!==-1){
    
    if(rooms[room][previousPlayerIndex].playedCard>=0 && rooms[room][previousPlayerIndex].playedCard<=12){
        previousCardHouse='hearts';
    }
    else if(rooms[room][previousPlayerIndex].playedCard>=13 && rooms[room][previousPlayerIndex].playedCard<=25){
        previousCardHouse='clubs';
    }
    else if(rooms[room][previousPlayerIndex].playedCard>=26 && rooms[room][previousPlayerIndex].playedCard<=38){
        previousCardHouse='diamonds';
    }
    else if(rooms[room][previousPlayerIndex].playedCard>=39 && rooms[room][previousPlayerIndex].playedCard<=51){
        previousCardHouse='spades';
    }
    }

    //if current card is of different house then previous card

    if(cardHouse!==previousCardHouse && previousCardHouse!==''){

        //find the player who played highest card in the current round excluding the player who played the card
        var highestCardPlayerIndex=0;
        var highestCard=-1;
        if(rooms[room][0].playedCard>highestCard && rooms[room][0].playedCard!==card){
          highestCard=rooms[room][0].playedCard;
          highestCardPlayerIndex=0;
        }
        if(rooms[room][1].playedCard>highestCard && rooms[room][1].playedCard!==card){
          highestCard=rooms[room][1].playedCard;
          highestCardPlayerIndex=1;
        }
        if(rooms[room][2].playedCard>highestCard && rooms[room][2].playedCard!==card){
          highestCard=rooms[room][2].playedCard;
          highestCardPlayerIndex=2;
        }
        if(rooms[room][3].playedCard>highestCard && rooms[room][3].playedCard!==card){
          highestCard=rooms[room][3].playedCard;
          highestCardPlayerIndex=3;
        }

      
        //send all the players that last card is a bomb
        io.to(room).emit("bomb", highestCardPlayerIndex);
        io.emit("bomb", highestCardPlayerIndex);

        //update the turn of the player who played highest card
        rooms[room][0].isTurn=false;
        rooms[room][1].isTurn=false;
        rooms[room][2].isTurn=false;
        rooms[room][3].isTurn=false;
        rooms[room][highestCardPlayerIndex].isTurn=true;

        //send updated players to players
        io.to(room).emit("update_players", rooms[room]);
        io.emit("update_players", rooms[room]);

    }
    //check if all the players played their cards
    
    else if((rooms[room][0]?.playedCard>=0 ||rooms[room][0]?.cardsCount==0)&&(rooms[room][1]?.playedCard>=0 ||rooms[room][1]?.cardsCount==0)&&(rooms[room][2]?.playedCard>=0 ||rooms[room][2]?.cardsCount==0)&&(rooms[room][3]?.playedCard>=0 ||rooms[room][3]?.cardsCount==0)){
        //find the player who played highest card in the current round
        var highestCardPlayerIndex=0;
        var highestCard=-1;
        if(rooms[room][0].playedCard>highestCard){
          highestCard=rooms[room][0].playedCard;
          highestCardPlayerIndex=0;
        }
        if(rooms[room][1].playedCard>highestCard){
          highestCard=rooms[room][1].playedCard;
          highestCardPlayerIndex=1;
        }
        if(rooms[room][2].playedCard>highestCard){
          highestCard=rooms[room][2].playedCard;
          highestCardPlayerIndex=2;
        }
        if(rooms[room][3].playedCard>highestCard){
          highestCard=rooms[room][3].playedCard;
          highestCardPlayerIndex=3;
        }
        //update the turn of the player who played highest card
        rooms[room][0].isTurn=false;
        rooms[room][1].isTurn=false;
        rooms[room][2].isTurn=false;
        rooms[room][3].isTurn=false;
        rooms[room][highestCardPlayerIndex].isTurn=true;

        //send updated players to players
        io.to(room).emit("update_players", rooms[room]);
        io.emit("update_players", rooms[room]);

    }
    else{
        //update the turn of the player who played the card
        rooms[room][playerIndex].isTurn=false;
        //update the turn of the next player if he has cards

        if(rooms[room][(playerIndex+1)%4].cardsCount>0){
        rooms[room][(playerIndex+1)%4].isTurn=true;
        }
        else if(rooms[room][(playerIndex+2)%4].cardsCount>0){
        rooms[room][(playerIndex+2)%4].isTurn=true;
        }
        else if(rooms[room][(playerIndex+3)%4].cardsCount>0){
        rooms[room][(playerIndex+3)%4].isTurn=true;
        }
        else{
        rooms[room][playerIndex].isTurn=true;
        }

        //send updated players to players
        io.to(room).emit("update_players", rooms[room]);
        io.emit("update_players", rooms[room]);
    }
 




    








    



  
    
  });


socket.on('clear_table', (room) => {

//clear the played cards of all players
    rooms[room][0].playedCard=-1;
    rooms[room][1].playedCard=-1;
    rooms[room][2].playedCard=-1;
    rooms[room][3].playedCard=-1;

    io.to(room).emit("update_players", rooms[room]);
    io.emit("update_players", rooms[room]);
    io.to(room).emit("played_house", '');
    io.emit("played_house", '');


       
//check if only one player has cards left

var playersWithCards=-1;
var looserIndex=-1;
if(rooms[room][0].cardsCount>0){
  playersWithCards++;
    looserIndex=0;
}
if(rooms[room][1].cardsCount>0){
  playersWithCards++;
    looserIndex=1;
}
if(rooms[room][2].cardsCount>0){
  playersWithCards++;
    looserIndex=2;
}
if(rooms[room][3].cardsCount>0){
  playersWithCards++;
    looserIndex=3;
}

if(playersWithCards===0){
    console.log('game over');
    console.log(looserIndex);
    //send the looser index to players
    io.to(room).emit("game_over", rooms[room][looserIndex]);
    io.emit("game_over", rooms[room][looserIndex]);
}


});

socket.on('pull_bomb', (data) => {

    const { room, playerId } = data;

    //add all the cards to the player who pulled the bomb

   //get the index of the player who played the card

   var pindex=rooms[room].findIndex((player) => player.id === playerId);
    var bombCards=[];
    for(let i=0;i<4;i++){
      if(rooms[room][i].playedCard!==-1){
        bombCards.push(rooms[room][i].playedCard);
        rooms[room][i].playedCard=-1;
      }
    }

    if(pindex===0){
        Cards[room].p1=Cards[room].p1.concat(bombCards);
        }
    else if(pindex===1){
        Cards[room].p2=Cards[room].p2.concat(bombCards);
        }
    else if(pindex===2){
        Cards[room].p3=Cards[room].p3.concat(bombCards);
        }
    else if(pindex===3){
        Cards[room].p4=Cards[room].p4.concat(bombCards);
        }


    //sending cards to players with sorted order
    io.to(rooms[room][0].id).emit("cards",Cards[room].p1.sort());
    io.to(rooms[room][1].id).emit("cards",Cards[room].p2.sort());
    io.to(rooms[room][2].id).emit("cards",Cards[room].p3.sort());
    io.to(rooms[room][3].id).emit("cards",Cards[room].p4.sort());

    //updating cards count  each player
    rooms[room][0].cardsCount=Cards[room].p1.length;
    rooms[room][1].cardsCount=Cards[room].p2.length;
    rooms[room][2].cardsCount=Cards[room].p3.length;
    rooms[room][3].cardsCount=Cards[room].p4.length;

    //sending updated players to players
    io.to(room).emit("update_players", rooms[room]);
    io.emit("update_players", rooms[room]);

    //sending played house to players
    io.to(room).emit("played_house", '');
    io.emit("played_house", '');

    //clear the bomb
    io.to(room).emit("clear_bomb");
    io.emit("clear_bomb");


       
//check if only one player has cards left

var playersWithCards=-1;
var looserIndex=-1;
if(rooms[room][0].cardsCount>0){
  playersWithCards++;
    looserIndex=0;
}
if(rooms[room][1].cardsCount>0){
  playersWithCards++;
    looserIndex=1;
}
if(rooms[room][2].cardsCount>0){
  playersWithCards++;
    looserIndex=2;
}
if(rooms[room][3].cardsCount>0){
  playersWithCards++;
    looserIndex=3;
}

if(playersWithCards===0){
    console.log('game over');
    console.log(looserIndex);
    //send the looser index to players
    io.to(room).emit("game_over", rooms[room][looserIndex]);
    io.emit("game_over", rooms[room][looserIndex]);
}



});


  socket.on("kick_player", (data) => {

    const { room, playerId } = data;

    // delete the player from the room
    rooms[room] = rooms[room].filter((player) => player.id !== data.playerid);

    io.sockets.sockets.get(data.playerid).disconnect(true);

    //disconnect the player from the room
  

 

    // Notify the other client in the room
    socket.to(room).emit("update_players", rooms[room]);


      socket.to(room).emit("update_players", rooms[room]);

      socket.emit("update_players", rooms[room]);

     
     

    }
      
     
  
      );


  socket.on("disconnect", () => {


    
    // Remove the player from all rooms when they disconnect
    for (const room in rooms) {
      rooms[room] = rooms[room].filter((player) => player.id !== socket.id);
      io.to(room).emit("update_players", rooms[room]);
    }

    console.log(`User Disconnected: ${socket.id}`);
  });
});

server.listen(3002, () => {
  console.log("SERVER IS RUNNING");
});
