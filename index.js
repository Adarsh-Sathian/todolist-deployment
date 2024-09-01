import express from "express";
import bodyParser from "body-parser";
import mongoose from "mongoose";
import { ObjectId } from "mongodb";
import _ from "lodash";
import env from "dotenv";
env.config();

const URL = process.env.MONGODB_URL || "mongodb://localhost:27017/";

const app = express();
const port = 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

const defaultItems = [
  { title: "Welcome to your To Do List!" },
  { title: "Hit the + button to add a new item." },
  { title: "Click the To Dos to Edit"},
  { title: "Tick the box to complete and remove the To Do"}
];

// Connnecting to MongoDB
async function connectToMongoDB() {
  try {
    await mongoose.connect(URL + "toDoListDB");
    console.log("Connected to MongoDB");
  }

  catch (err) {
    console.log("Failed to connect to MongoDB: ", err);
  }
}
await connectToMongoDB();

// Defining various schemas
const itemSchema = new mongoose.Schema({
  title: {
    type: String,
    require: true
  }
});

const Item = mongoose.model("Item", itemSchema);

const listSchema = new mongoose.Schema({
  name: String,
  items: [itemSchema]
});

const List = mongoose.model("List", listSchema);

// Routing
app.get("/", async (req, res) => {
  try {
    const foundItems = await Item.find({});
    console.log(foundItems);
    if (foundItems.length === 0) {
      try {
        await Item.insertMany(defaultItems);
        res.render("index.ejs", {
          listTitle: "Today",
          listItems: defaultItems,
        });
      } catch (err) {
        console.log(err);
      }
    } else {
      res.render("index.ejs", {
        listTitle: "Today",
        listItems: foundItems,
      });
    }
    
  } catch (err) {
    console.log(err);
  }
  
});

app.get("/:customListName", async (req, res) => {

  const customListName = _.capitalize(req.params.customListName);

  try {
    const foundList = await List.findOne({name: customListName});
    if(!foundList) {
      console.log("Does not exist!");
      const newList = List({
      name: customListName,
      items: defaultItems
    })
      try {
        await newList.save();
      } catch (err) {
        console.log(err);
      }    
      res.render("index.ejs", {
          listTitle: customListName,
          listItems: newList.items
        });
    } else {
      console.log("Exists!")
      console.log(await List.findOne({name: customListName}));
      res.render("index.ejs", {
        listTitle: customListName,
        listItems: foundList.items
      })
    }
  } catch (err) {
    console.log(err);
  }
  

})


app.post("/add", async (req, res) => {
  const item = req.body.newItem;
  const listName = req.body.list;
  console.log(listName);
  // items.push({ title: item }); 
 
  try {
    if (listName === "Today") {


      const newItem = new Item({title: item});
      await newItem.save();

      res.redirect("/");


    } else {
      try{

        let list = await List.findOne({name: listName});
        const newItem = new Item({title: item})
        list.items.push(newItem);

        await List.updateOne({name: listName}, 
        { 
          $set: {items: list.items}
        });

        console.log(list.items);

        res.redirect("/" + listName);

      } 
      
      catch (err) {
        console.log(err);
      }
      
    }
  } 

  catch (err) {
    console.log(err);
  }

});

app.post("/edit", async (req, res) => {

  const listName = req.body.list;
  console.log(listName);

  let id = ObjectId.createFromHexString(req.body.updatedItemId);
  console.log(id);

  const updatedTitle = req.body.updatedItemTitle;
  console.log(updatedTitle);

  try{

    let list = await List.findOne({name: listName});


    if(listName === "Today") {
      try{
        await Item.updateOne({_id: id}, {$set: {title: updatedTitle}});
        res.redirect("/");
      } catch(err) {console.log(err);}
    }
    
    
    else {


      try {

        await List.updateOne({name: listName}, 
          {$set:{"items.$[item].title": updatedTitle}}, 
          {arrayFilters: [{"item._id": id}]}
        );

        res.redirect("/" + listName);

      } catch (err) {

        console.log(err);

      }


    }
    
  } catch (err) {

    console.log(err);

  }
});

app.post("/delete", async (req, res) => {

  const id = ObjectId.createFromHexString(req.body.deleteItemId);
  console.log(id);

  const listName = req.body.listName;
  console.log(listName);

  if(listName === "Today") {
    try{

      await Item.deleteOne({_id: id});
      res.redirect("/");

    } 
    
    catch (err) {
      console.log(err);
    }

  } 
  
  else {
    try {

      await List.findOneAndUpdate({name: listName}, {$pull: {items: {_id: id}}}, {returnDocument: "after"});
      res.redirect("/" + listName);

    } catch (err) {

      console.log(err);

    }

  }

});

app.listen(port, () => {

  console.log(`Server running on port ${port}`);

});
