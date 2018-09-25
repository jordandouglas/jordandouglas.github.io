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


#include "PhyloTreeNode.h"
#include "Settings.h"

#include <iostream>
#include <string>


using namespace std;



PhyloTreeNode::PhyloTreeNode() {

    this->ID = "";
    this->rate = 1;
    this->time = 0;
    this->leftChild = nullptr;
    this->rightChild = nullptr;
    this->parent = nullptr;
}



void PhyloTreeNode::addChildren(PhyloTreeNode* left, PhyloTreeNode* right){


    cout << "Node has children" << endl;

    this->leftChild = left;
    this->rightChild = right;
    left->parent = this;
    right->parent = this;

}


string PhyloTreeNode::getID(){
    return this->ID;
}


void PhyloTreeNode::setID(string id){
    this->ID = id;
}


void PhyloTreeNode::parseNode(string newick){

    if (newick == "") return;



    // Find the important points
    int openingSquareBracketIndex = -1;
    int rateStartIndex = -1;
    int timeStartIndex = -1;
    string line = newick;
    std::transform(line.begin(), line.end(), line.begin(), ::tolower);
    for (int i = 0; i < line.size(); i ++){

        if (line.substr(i,1) == "[" && openingSquareBracketIndex == -1) openingSquareBracketIndex = i;
        else if (line.substr(i,5) == "rate=") rateStartIndex = i + 5;
        else if (line.substr(i,2) == "]:") timeStartIndex = i + 2;

    }



    // Get ID (if there is one it will be before the [...])
    if (openingSquareBracketIndex > 0) this->ID = newick.substr(0, openingSquareBracketIndex);

    //cout << "openingSquareBracketIndex" << openingSquareBracketIndex << ":" << this->ID << endl;
    

    // Get rate
    if (rateStartIndex != -1) {
        string rate_str = "";
        for (int i = rateStartIndex; i < newick.size(); i ++){
            string symbol = newick.substr(i,1);
            if (symbol == "," || symbol == "]") break;
            rate_str += symbol;
        }

        // Parse double from string
        //cout << "Node has rate " << rate_str << endl;
        this->rate = stof(rate_str);

    }



    // Get time (or distance if there is no rate)
    if (timeStartIndex != -1) {
        string time_str = "";
        for (int i = timeStartIndex; i < newick.size(); i ++){
            string symbol = newick.substr(i,1);
            if (symbol == ",") break;
            time_str += symbol;
        }

        // Parse double from string
        //cout << "Node has time " << time_str << endl;
        this->time = stof(time_str);

    }else{

        //cout << "Node does not have a time" << endl;

    }


}



// Is this node a leaf?
bool PhyloTreeNode::isLeaf(){
    return this->leftChild == nullptr && this->rightChild == nullptr; 
}



// Is this node a root?
bool PhyloTreeNode::isRoot(){
    return this->parent == nullptr;
}



// Set the sequence of this node
void PhyloTreeNode::setSequence(Sequence* seq){
    this->sequence = seq;
}


// Get all leaves under this node
list<PhyloTreeNode*> PhyloTreeNode::getLeaves(){



    list<PhyloTreeNode*> leaves;

    // If leaf then return list with this node
    if (this->isLeaf()){
        leaves.push_back(this);
    }

    // Otherwise return a list with childrens leaves combined
    else{
        leaves = this->leftChild->getLeaves();
        list<PhyloTreeNode*> right_leaves = this->rightChild->getLeaves();
        leaves.merge(right_leaves);
    }

    return leaves;

}


// Print this node
void PhyloTreeNode::print(){

    cout << (this->ID == "" ? "Node" : this->ID) << ":";
    cout << "rate = " << this->rate;
    cout << ", time = " << this->time << endl; 

}


// Calculate the distance between this node and the root
double PhyloTreeNode::getDistanceToRoot(){
    if (this->isRoot()) return 0;
    return this->time + this->parent->getDistanceToRoot();
}



// Returns the parent of this node
PhyloTreeNode* PhyloTreeNode::getParent(){
    return this->parent;
}
