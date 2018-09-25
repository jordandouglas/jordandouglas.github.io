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


#include "PhyloTree.h"
#include "Settings.h"

#include <iostream>
#include <string>


using namespace std;




PhyloTree::PhyloTree() {

    this->root = nullptr;
    
}



// Load the tree nodes and attributes from a nexus string
string PhyloTree::parseFromNexus(string nexus) {

    cout << "Parsing nexus " << nexus << endl;


    vector<string> nexus_split = Settings::split(nexus, '|'); // | used a line break


    // Get the important lines (ie start and ends of the taxa and tree blocks). Will not parse any other blocks
    int taxaBeginLine = -1;
    int taxaEndLine = -1;
    int treeBeginLine = -1;
    int treeEndLine = -1;
    string currentBlock = "";
    for (int i = 0; i < nexus_split.size(); i ++){
        
        // Trim and to lower case
        string line = Settings::trim(nexus_split.at(i));
        std::transform(line.begin(), line.end(), line.begin(), ::tolower);



        if (line == "begin taxa;") {
            if (currentBlock != "") return "ERROR: nested block at line " + to_string(i+1);
            taxaBeginLine = i;
            currentBlock = "taxa";
        }

        else if (line == "begin trees;") {
            if (currentBlock != "") return "ERROR: nested block at line " + to_string(i+1);
            treeBeginLine = i;
            currentBlock = "trees";
        }

        else if (line.substr(0, 5) == "begin"){
            if (currentBlock != "") return "ERROR: nested block at line " + to_string(i+1);
            currentBlock = "other";
        }

        else if (line == "end;"){
            if (currentBlock == "") return "ERROR: no block to end at line " + to_string(i+1);

            if (currentBlock == "taxa") taxaEndLine = i;
            else if (currentBlock == "trees") treeEndLine = i;

            currentBlock = "";

        }

    }


    // Check that taxa and tree blocks were succssfully located
    if (taxaBeginLine == -1 || taxaEndLine == -1) return "ERROR: could not parse taxa block";
    if (treeBeginLine == -1 || treeEndLine == -1) return "ERROR: could not parse tree block";


    // Parse the taxa
    list<string> taxaNames;
    bool startParsing = false;
    for (int i = taxaBeginLine + 1; i < taxaEndLine; i ++){

        string line = Settings::trim(nexus_split.at(i));
        std::transform(line.begin(), line.end(), line.begin(), ::tolower);

        if (line == "") continue;
        else if (line == ";") break;
        else if (startParsing) taxaNames.push_back(Settings::trim(nexus_split.at(i)));
        else if (line == "taxlabels") startParsing = true;

    }

    if (taxaNames.size() == 0) return "ERROR: no taxa found";
    cout << taxaNames.size() << " taxa" << endl; 


    // Get the newick line
    string newick = "";
    map<string, string> translateMap; // Map a short index to a full taxa name 
    bool translating = false;
    for (int i = treeBeginLine + 1; i < treeEndLine; i ++){

        string line = Settings::trim(nexus_split.at(i));
        std::transform(line.begin(), line.end(), line.begin(), ::tolower);

       // cout << "|" << line << "|" << endl;


        // Translate?
        if (line == "translate") translating = true;

        else if (line == ";" && translating) translating = false;
        

        else if (translating){

           
            vector<string> line_split = Settings::split(Settings::trim(nexus_split.at(i)), ' '); // Split by space
            if (line_split.size() != 2) return "ERROR: translate line " + to_string(i) + " does not contain 2 components";

            string key = line_split.at(0);
            string full = line_split.at(1); 
            if (full.substr(full.length()-1, 1) == ",") full = full.substr(0, full.length() - 1); // Remove the trailing ','
            translateMap[key] = full;

        }


        else if (line.substr(0,4) == "tree" && !translating) {

            // Tree line. Find the first '(' and the last ';'
            int newick_start = 0;
            for (newick_start = 0; newick_start < line.size(); newick_start ++){
                if (line.substr(newick_start,1) == "(") break;
            }

            int newick_end = 0;
            for (newick_end = line.size()-1; newick_end > newick_start; newick_end --){
                if (line.substr(newick_end,1) == ";") break;
            }

            if ( !(newick_start < line.size() && newick_end > newick_start) )  return "ERROR: mismatching newick brackets";

            // Get newick string (but not the lowercase version of the line)
            newick = Settings::trim(nexus_split.at(i)).substr(newick_start, newick_end - newick_start + 1);
            //break;
        }

    }


    //cout << "Newick " << newick << endl;
    if (newick.size() == 0) return "ERROR: no tree found";




    // Recursively parse the tree
    this->root = new PhyloTreeNode();

    string error = PhyloTree::parseNewickRecurse(this->root, newick);
    if (error != "") {
        this->clear();
        return error;
    }



    // Translate the leaves back into their original labels
    vector<PhyloTreeNode*> leaves = this->getLeaves();
    for (int leafIndex = 0; leafIndex < leaves.size(); leafIndex ++){

        string accession = leaves.at(leafIndex)->getID();
        if (translateMap.find(accession) != translateMap.end()){
            //cout << "Translating " << accession << " into " << translateMap[accession] << endl;
            leaves.at(leafIndex)->setID(translateMap[accession]);
        }

    }



    return "";

}

string PhyloTree::parseNewickRecurse(PhyloTreeNode* node, string newick){


    
   //cout << "Parsing subnewick " << newick << endl;


    // Find first '(' and last ')'
    int newick_start = 0;
    for (newick_start = 0; newick_start < newick.size(); newick_start ++){
        if (newick.substr(newick_start,1) == "(") break;
    }

    int newick_end = 0;
    for (newick_end = newick.size()-1; newick_end > newick_start; newick_end --){
        if (newick.substr(newick_end,1) == ")") break;
    }


    // If there are no round brackets, this is a leaf
    if ( !(newick_start < newick.size() || newick_end > newick_start) ){
        
        // Base case -> at leaf, no children
        //cout << "Found leaf " << newick << endl;
        node->parseNode(newick);
        return "";

    }


    // If the two both exist then parse the thisi internal node / root, remove the brackets, and proceed
    else if (newick_start < newick.size() && newick_end > newick_start){


        //cout << "Internal node " << newick.substr(newick_end + 1) << endl;

        // Parse the current node
        node->parseNode(newick.substr(newick_end + 1));

        newick_start++;
        newick_end--;
        newick = newick.substr(newick_start, newick_end - newick_start + 1); 


    }


    // There was a parsing error
    else {

        return "ERROR: unbalanced brackets in newick string. Ensure this is a binary tree.";


    }



    string leftChild_newick = "";
    string rightChild_newick = "";

    // Get left and right child newicks of current node by finding the comma
    // The comma must not be nested within any ( or [ brackets
    int roundBracketDepth = 0;
    int squareBracketDepth = 0;
    for (int i = 0; i < newick.size(); i ++){

        string symbol = newick.substr(i, 1);
        if (symbol == "(") roundBracketDepth ++;
        else if (symbol == ")") roundBracketDepth --;
        else if (symbol == "[") squareBracketDepth ++;
        else if (symbol == "]") squareBracketDepth --;

        // Get left and right child newick strings
        else if (symbol == "," && roundBracketDepth == 0 && squareBracketDepth == 0){


            leftChild_newick = newick.substr(0, i-1); 
            rightChild_newick = newick.substr(i+1);
            break;

        }

    }





    PhyloTreeNode* leftChild = new PhyloTreeNode();
    PhyloTreeNode* rightChild = new PhyloTreeNode();
    node->addChildren(leftChild, rightChild);




    // Recurse down to children
    string error = PhyloTree::parseNewickRecurse(leftChild, leftChild_newick);
    if (error != "") return error;
    error = PhyloTree::parseNewickRecurse(rightChild, rightChild_newick);
    if (error != "") return error;


    return "";



}


// Get the leaves
vector<PhyloTreeNode*> PhyloTree::getLeaves(){
    list<PhyloTreeNode*> leaves = this->root->getLeaves();
    std::vector<PhyloTreeNode*> leaves_vector{ std::begin(leaves), std::end(leaves) };
    return leaves_vector;
}




// Recursively delete all the nodes
void PhyloTree::clear(){


    

}


// Get the newick string
string PhyloTree::getNewick(){
    return this->root->getNewick();
}




// Get the most recent common ancestor
PhyloTreeNode* PhyloTree::getMRCA(PhyloTreeNode* node1, PhyloTreeNode* node2){


    // Build a list of nodes that traces back from node1 to the root
    PhyloTreeNode* nodeTmp = node1;
    list<PhyloTreeNode*> trace;
    trace.push_back(nodeTmp);
    while(!nodeTmp->isRoot()){
           nodeTmp = nodeTmp->getParent();
           trace.push_back(nodeTmp);
    }


    // Find the first node in the other node's trace that is on this list
    nodeTmp = node2;
    if (nodeTmp->isRoot()) return nodeTmp;
    while(true){

        // See if this node is on the trace
        for (list<PhyloTreeNode*>::iterator it = trace.begin(); it != trace.end(); ++it){
            if (nodeTmp == (*it)) {
                //cout << "Found the MRCA of " << node1->getID() << " and " << node2->getID() << endl;
                return nodeTmp;
            }
        }


        if (nodeTmp->isRoot()) break;

        nodeTmp = nodeTmp->getParent();
        
    }

    cout << "Error: could not find the ancestor of " << node1->getID() << " and " << node2->getID() << endl;
    exit(0);

    return nullptr;




}


