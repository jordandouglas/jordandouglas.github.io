
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


#ifndef PHYLOTREENODE_H
#define PHYLOTREENODE_H

#include "Sequence.h"


#include <string>
#include <vector>

using namespace std;

// A leaf, root or internal vertex of a tree
class PhyloTreeNode {


    PhyloTreeNode* parent;
    PhyloTreeNode* leftChild;
    PhyloTreeNode* rightChild;
    string ID;
    Sequence* sequence;

    // Height of node and rate/time of incident branch
    double rate;
    double time;


    public:

        PhyloTreeNode();


        void addChildren(PhyloTreeNode* left, PhyloTreeNode* right);
        bool isLeaf();
        bool isRoot();
        Sequence* getSequence();
        string getID();
        void setID(string ID);
        void parseNode(string newick);
        void setSequence(Sequence* seq);

        list<PhyloTreeNode*> getLeaves();
        void print();
        double getDistanceToRoot();
        PhyloTreeNode* getParent();
        string getNewick();

};

#endif