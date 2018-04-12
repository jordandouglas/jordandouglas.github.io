/* 
	--------------------------------------------------------------------
	--------------------------------------------------------------------
	This file is part of SimPol.

    SimPol is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    SimPol is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with SimPol.  If not, see <http://www.gnu.org/licenses/>. 
    --------------------------------------------------------------------
    --------------------------------------------------------------------
-*/


#include "HTMLobject.h"
#include "Settings.h"


#include <string>
#include <iostream>



using namespace std;

// Send a single instruction to the controller. eg. clear
HTMLobject::HTMLobject(string instruction){

	this->id = instruction;


	if(this->id == "") cout << "No id 1" << endl;

	// Defaults 
	this->x = 0;
	this->y = 0;
	this->width = 0;
	this->height = 0;
	this->src = "";
	this->animationTime = 0;
	this->zIndex = 1;
	this->dx = 0;
	this->dy = 0;
	this->needsGenerating = true;
	this->needsAnimating = false;
	this->needsSourceUpdate = false;
	this->needsDeleting = true;
	this->baseStr = "";
	this->hasTP = false;
	this->ntPos = -1;
	this->whichSeq = "";
}


// Default constructor
HTMLobject::HTMLobject(string id, double x, double y, double width, double height, string src, int animation_time, int zIndex){

	this->id = id;
	this->x = x;
	this->y = y;
	this->width = width;
	this->height = height;
	this->src = src;
	this->animationTime = animation_time;
	this->zIndex = zIndex;


	// Defaults 
	this->dx = 0;
	this->dy = 0;
	this->needsGenerating = true;
	this->needsAnimating = false;
	this->needsSourceUpdate = false;
	this->needsDeleting = false;
	this->baseStr = "";
	this->hasTP = false;
	this->ntPos = -1;
	this->whichSeq = "";


	if(this->id == "") cout << "No id 2 " << endl;

}



// Nucleotide constructor
HTMLobject::HTMLobject(string id, double x, double y, double width, double height, string src, int animation_time, int zIndex, string baseStr, string whichSeq, bool hasTP, int ntPos){

	this->id = id;
	this->x = x;
	this->y = y;
	this->width = width;
	this->height = height;
	this->src = src;
	this->animationTime = animation_time;
	this->zIndex = zIndex;
	this->baseStr = baseStr;
	this->hasTP = hasTP;
	this->ntPos = ntPos;
	this->whichSeq = whichSeq;

	// Defaults 
	this->dx = 0;
	this->dy = 0;
	this->needsGenerating = true;
	this->needsAnimating = false;
	this->needsSourceUpdate = false;
	this->needsDeleting = false;


	if(this->id == "") cout << "No id 3 " << src << "," << ntPos << endl;

}



// Get the JSON string of this object. If select render, then will also change the object to reflect that rendering has occurred
string HTMLobject::toJSON(bool render){

	string JSON = "";
	JSON += "{";

	JSON += "'id':'" + this->id + "',"; 
	JSON += "'src':'" + this->src + "',"; 

	// Nucleotide only
	if (this->baseStr != "") {
		JSON += "'base':'" + this->baseStr + "',"; 
		JSON += "'hasTP':" + string(this->hasTP ? "true" : "false") + ","; 
		JSON += "'pos':" + to_string(this->ntPos) + ","; 
		JSON += "'seq':'" + this->whichSeq + "',"; 
	}


	// Display information
	JSON += "'x':" + to_string(this->x) + ","; 
	JSON += "'y':" + to_string(this->y) + ","; 
	JSON += "'dx':" + to_string(this->dx) + ","; 
	JSON += "'dy':" + to_string(this->dy) + ","; 
	JSON += "'width':" + to_string(this->width) + ","; 
	JSON += "'height':" + to_string(this->height) + ","; 
	JSON += "'animationTime':" + to_string(this->animationTime) + ","; 
	JSON += "'zIndex':" + to_string(this->zIndex) + ","; 


	// Meta information
	JSON += "'needsGenerating':" + string(this->needsGenerating ? "true" : "false") + ","; 
	JSON += "'needsAnimating':" + string(this->needsAnimating ? "true" : "false") + ","; 
	JSON += "'needsSourceUpdate':" + string(this->needsSourceUpdate ? "true" : "false") + ","; 
	JSON += "'needsDeleting':" + string(this->needsDeleting ? "true" : "false"); 

	JSON += "}";


	if (render){

		if (this->needsDeleting){
			this->hasTP = false;
			this->needsDeleting = false;
		}
		if (this->needsAnimating){
			this->dx = 0;
			this->dy = 0;
			this->needsAnimating = false;
		}
		this->needsGenerating = false;
		this->needsSourceUpdate = false;

	}

	return JSON;


}


void HTMLobject::displace(double dx, double dy){
	this->dx += dx;
	this->x += dx;
	this->dy += dy;
	this->y += dy;
	this->needsAnimating = true;
}

void HTMLobject::set_needsAnimating(){
	this->needsAnimating = true;
}

void HTMLobject::updateSrc(string newSrc){
	this->src = newSrc;
	this->needsSourceUpdate = true;
}

void HTMLobject::setTP(bool addTP){
	this->hasTP = addTP;
}

bool HTMLobject::get_hasTP(){
	return this->hasTP;
}

void HTMLobject::deleteObject(){
	this->needsDeleting = true;
}

double HTMLobject::getX(){
	return this->x;
}

double HTMLobject::getY(){
	return this->y;
}

double HTMLobject::getWidth(){
	return this->width;
}

double HTMLobject::getHeight(){
	return this->height;
}



string HTMLobject::getID(){
	return this->id;
}

string HTMLobject::getBase(){
	return this->baseStr;
}

void HTMLobject::setAnimationTime(int animationTime){
	this->animationTime = animationTime;
}

bool HTMLobject::get_needsGenerating(){
	return this->needsGenerating;
}

bool HTMLobject::get_needsAnimating(){
	return this->needsAnimating;
}

bool HTMLobject::get_needsSourceUpdate(){
	return this->needsSourceUpdate;
}

bool HTMLobject::get_needsDeleting(){
	return this->needsDeleting;
}