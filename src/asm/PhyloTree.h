
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


#ifndef PHYLOTREE_CLASS_H
#define PHYLOTREE_CLASS_H



#include "PhyloTreeNode.h"



#include <string>
#include <vector>
#include <list>

using namespace std;



class PhyloTree {


    PhyloTreeNode* root;
    string parseNewickRecurse(PhyloTreeNode* node, string newick);


    public:
        PhyloTree();


        string parseFromNexus(string nexus);
        void clear();
        vector<PhyloTreeNode*> getLeaves();
        string getNewick();
        PhyloTreeNode* getMRCA(PhyloTreeNode* node1, PhyloTreeNode* node2);

};




#endif





