module.exports = timeout => {
  return new Promise(resolve => {
    setTimeout(resolve, timeout)
  })
}
