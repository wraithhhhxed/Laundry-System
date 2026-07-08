 // Do not forget to subscribe my youtube channel ktronic110 
void setup() {
  pinMode(3,OUTPUT); //output pin for relay board, this will sent signal to the relay
  
  pinMode(6,INPUT); //input pin coming from soil sensor
}

void loop() { 
  digitalRead(6);  // reading the coming signal from the soil sensor
  if(6 == HIGH) // if water level is full then cut the relay 
  {
  digitalWrite(3,LOW); // low is to cut the relay
  }
  else
  {
  digitalWrite(3,HIGH); //high to continue proving signal and water supply
  }
  delay(400); 
}