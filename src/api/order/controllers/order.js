"use strict";
const stripe = require("stripe")(process.env.STRIPE_KEY);
/**
 * order controller
 */

const { createCoreController } = require("@strapi/strapi").factories;

module.exports = createCoreController("api::order.order", ({ strapi }) => ({
  async create(ctx) {
    const { products, engraving, phoneNumber } = ctx.request.body; // Added phoneNumber here
    try {
      const lineItems = await Promise.all(
        products.map(async (product) => {
          const item = await strapi
            .service("api::product.product")
            .findOne(product.id);

          console.log("this is item------->", item);
          console.log("this is product------->", product);

          return {
            price_data: {
              currency: "inr",
              product_data: {
                name: item.name,
              },
              unit_amount: Math.round(item.price * 100),
            },
            quantity: product.quantity,
          };
        })
      );

      const session = await stripe.checkout.sessions.create({
        shipping_address_collection: { allowed_countries: ["IN"] },
        payment_method_types: ["card"],
        mode: "payment",
        success_url: process.env.CLIENT_URL + `/success`,
        cancel_url: process.env.CLIENT_URL + "/failed",
        line_items: lineItems,
        custom_fields: [
          {
            key: 'engraving',
            label: {
              type: 'custom',
              custom: 'please add you product name with size',
            },
            type: 'text',
            value: engraving, // Added engraving value here
          },
          {
            key: 'phone_number',
            label: {
              type: 'custom',
              custom: 'Phone Number',
            },
            type: 'text',
            value: phoneNumber, // Added phoneNumber value here
          },
        ],
      });

      await strapi
        .service("api::order.order")
        .create({ data: { products, stripeId: session.id, engraving, phoneNumber } }); // Added phoneNumber here

      return { stripeSession: session };
    } catch (error) {
      ctx.response.status = 500;
      return { error };
    }
  },
}));
