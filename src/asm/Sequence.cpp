

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



#include "Sequence.h"
#include "Settings.h"

using namespace std;

Sequence::Sequence(string seqID, string TemplateType, string PrimerType, string templateSequence){

	this->seqID = seqID;
	this->templateSequence = templateSequence;
	this->nascent_RNA = PrimerType.substr(2) == "RNA";
	this->template_RNA = TemplateType.substr(2) == "RNA";
	this->nascent_SS = PrimerType.substr(0,2) == "ss";
	this->template_SS = TemplateType.substr(0,2) == "ss";
	if (!this->template_SS) this->complementSequence = Settings::complementSeq(this->templateSequence, this->template_RNA);
	else this->complementSequence = "";

}


string Sequence::toJSON(){
	string nascentType = string(this->nascent_SS ? "ss" : "ds") + string(this->nascent_RNA ? "RNA" : "DNA");
	string templateType = string(this->template_SS ? "ss" : "ds") + string(this->template_RNA ? "RNA" : "DNA");
	string parametersJSON = seqID + ":{seq:" + templateSequence + ",template:" + templateType + ",primer:" + nascentType + "}";
	return parametersJSON;
}


void Sequence::print(){
	string nascentType = string(this->nascent_SS ? "ss" : "ds") + string(this->nascent_RNA ? "RNA" : "DNA");
	string templateType = string(this->template_SS ? "ss" : "ds") + string(this->template_RNA ? "RNA" : "DNA");
	cout << seqID << "; TemplateType: " << templateType << "; PrimerType: " << nascentType << endl;
	cout << complementSequence << endl;
	cout << templateSequence << endl << endl;

}


string Sequence::getID(){
	return this->seqID;
}

string Sequence::get_templateSequence(){
	return this->templateSequence;
}
string Sequence::get_complementSequence(){
	return this->complementSequence;
}


string Sequence::get_templateType(){
	string templateType = string(this->template_SS ? "ss" : "ds") + string(this->template_RNA ? "RNA" : "DNA");
	return templateType;
}


string Sequence::get_primerType(){
	string nascentType = string(this->nascent_SS ? "ss" : "ds") + string(this->nascent_RNA ? "RNA" : "DNA");
	return nascentType;
}



bool Sequence::nascentIsRNA(){
	return this->nascent_RNA;
}
bool Sequence::templateIsRNA(){
	return this->template_RNA;
}
bool Sequence::nascentIsSS(){
	return this->nascent_SS;
}
bool Sequence::templateIsSS(){
	return this->template_SS;
}