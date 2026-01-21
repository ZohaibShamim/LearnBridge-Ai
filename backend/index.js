import app from "./app.js";
import connectDB from "./utils/connectDB.js";

const PORT = process.env.PORT || 8000;

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
});
