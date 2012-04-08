
/**
 * Module dependencies.
 */

var express = require('express');
var EventEmitter = require('events').EventEmitter;

var events = new EventEmitter();

var app = module.exports = express.createServer();

var io = require('socket.io').listen(app);

// Configuration

io.configure('production', function(){
  io.enable('browser client etag');
  io.set('log level', 1);

  io.set('transports', [
    'websocket'
  , 'flashsocket'
  , 'htmlfile'
  , 'xhr-polling'
  , 'jsonp-polling'
  ]);
});

io.configure('development', function(){
  io.enable('browser client etag');
  io.set('log level', 1);

  io.set('transports', [
    'websocket'
  , 'flashsocket'
  , 'htmlfile'
  , 'xhr-polling'
  , 'jsonp-polling'
  ]);
});


app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true })); 
});

app.configure('production', function(){
  app.use(express.errorHandler()); 
});


var totalCells = 30;
var totalCellsProcessed = 0;

var cells = new Array(totalCells);
for(var i=0; i<totalCells; i++) {
  cells[i] = new Array(totalCells);
}

function generateCells() {
  for(var i=0; i<totalCells; i++) {
    for(var j=0; j<totalCells; j++){
	var rand = Math.random()*100;
     	if(rand>=90){
	    cells[i][j]=true;
        }
	else {
	    cells[i][j]=false;
	}
    }
  }
}

generateCells();

// Routes
app.get('/', function(req, res){
  res.render('index', {
    title: 'Express',
    cells: cells
  });
});


//Events
events.on('seed', function(cell){
  //seed a new cell 
  cells[cell.X][cell.Y].alive = true;
});

events.on('process generation', function(){
  for(var x = 0; x<totalCells; x++)
  {
    for(var y = 0; y<totalCells; y++)
    {
      events.emit('process cell', cells[x][y]);
    }
  }
});

events.on('generation processed', function(){
  events.emit('process generation');
});

events.on('process cell', function(cell){
  // Determine if the cell will live or die
  events.emit('process rule1', cell);
  events.emit('process rule2', cell);
  events.emit('process rule3', cell);
});

events.on('cell processed', function(cell){
  totalCellsProcessed++;
  if(totalCellsProcessed >= totalCells){
    totalCellsProcessed = 0;
    events.emit('generation processed');
  }
});

events.on('rule processed', function(cell){
  if(cell.rules_processed==3){
    cell.rules_processed = 0;
    events.emit('cell processed',cell);
  } else{
    cell.rules_processed++;
  }
});


events.on('process rule1', function(cell){
  //Any live cell with fewer than two live neighbours dies, as if caused by under-population.
  events.emit('rule processed', cell);
});

events.on('process rule2', function(cell){
  //Any live cell with two or three live neighbours lives on to the next generation.
  events.emit('rule processed', cell);
});

events.on('process rule3', function(cell){
  //Any dead cell with excatly three live neighbours become a live cell, as if by reproduction.
  events.emit('rule processed', cell);
});



events.on('regenerate', function(){
 // generateCells();
  io.sockets.emit('regenerated', cells);
});

setInterval(
	function(){
		events.emit('regenerate')
	},50);


app.listen(3000);

console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
